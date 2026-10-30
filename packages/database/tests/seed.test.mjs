import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import { compare } from "bcryptjs";
import { getPrismaClient, closeDatabaseConnection } from "../dist/index.js";
import {
  assertDevelopmentEnvironment,
  seedDatabase,
} from "../prisma/seed/seed-database.mjs";
import { seedId, seedPassword, seedEmail } from "../prisma/seed/seed-data.mjs";

config({ path: new URL("../../../.env", import.meta.url), quiet: true });

test("seed refuses environments other than local development", () => {
  const local = "postgresql://user:password@localhost:5432/conecta";
  for (const NODE_ENV of [undefined, "test", "production"]) {
    assert.throws(() =>
      assertDevelopmentEnvironment({ NODE_ENV, DATABASE_URL: local }),
    );
  }
  assert.throws(() =>
    assertDevelopmentEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://user:password@remote.example.com/db",
    }),
  );
  assert.doesNotThrow(() =>
    assertDevelopmentEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: local,
    }),
  );
});

test("seed creates scenarios once and preserves the administrator and user edits", async (context) => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Defina TEST_DATABASE_URL para testar o seed em um schema isolado.",
  );
  const schema = `test_seed_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("schema", schema);
  const connection = new pg.Client({ connectionString: url.toString() });
  await connection.connect();
  context.after(async () => {
    try {
      await closeDatabaseConnection();
    } finally {
      try {
        await connection.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await connection.end();
      }
    }
  });
  await connection.query(`CREATE SCHEMA "${schema}"`);
  await connection.query(`SET search_path TO "${schema}"`);
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of (await readdir(migrations)).sort()) {
    if (/^\d+_/.test(name))
      await connection.query(
        await readFile(new URL(`${name}/migration.sql`, migrations), "utf8"),
      );
  }
  const prisma = getPrismaClient(url.toString());
  await assert.rejects(seedDatabase(prisma), /exatamente um ADMIN/);
  assert.equal(await prisma.user.count(), 0);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      role: "ADMIN",
      passwordHash: "existing-admin-password-hash",
    },
  });
  // A normal account must remain untouched and is not part of the seed quantities.
  const other = await prisma.user.create({
    data: {
      email: "existing@example.com",
      role: "YOUTH",
      passwordHash: "existing-user-password-hash",
    },
  });
  assert.deepEqual(await seedDatabase(prisma), {
    youths: 15,
    companies: 5,
    jobs: 25,
  });
  assert.equal(await prisma.user.count(), 22);
  assert.equal(await prisma.youthProfile.count(), 15);
  assert.equal(await prisma.companyProfile.count(), 5);
  assert.equal(await prisma.job.count(), 25);
  assert.equal(await prisma.resume.count(), 10);
  const statuses = await prisma.companyValidation.groupBy({
    by: ["status"],
    _count: true,
  });
  assert.deepEqual(
    Object.fromEntries(statuses.map(({ status, _count }) => [status, _count])),
    { APPROVED: 3, PENDING: 1, REJECTED: 1 },
  );
  const youth = await prisma.user.findUniqueOrThrow({
    where: { id: seedId("youth-user", 1) },
  });
  assert.ok(await compare(seedPassword, youth.passwordHash));
  await prisma.youthProfile.update({
    where: { id: seedId("youth-profile", 1) },
    data: { firstName: "Nome editado" },
  });
  await prisma.job.update({
    where: { id: seedId("job", 1) },
    data: { status: "CLOSED" },
  });
  const snapshot = async () => ({
    users: await prisma.user.findMany({
      orderBy: { id: "asc" },
      include: {
        youthProfile: {
          include: {
            resume: {
              include: { skills: true, educations: true, experiences: true },
            },
          },
        },
        companyProfile: { include: { validation: true } },
      },
    }),
    jobs: await prisma.job.findMany({ orderBy: { id: "asc" } }),
  });
  const before = await snapshot();
  const cli = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../prisma/seed.mjs", import.meta.url))],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: url.toString(),
      },
    },
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /15 jovens, 5 empresas e 25 vagas/);
  await Promise.all([seedDatabase(prisma), seedDatabase(prisma)]);
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(
    await prisma.user.findUnique({ where: { id: admin.id } }),
    admin,
  );
  assert.deepEqual(
    await prisma.user.findUnique({ where: { id: other.id } }),
    other,
  );
  assert.equal(await prisma.user.count({ where: { role: "ADMIN" } }), 1);
  // A conflicting reserved account aborts the transaction instead of modifying it.
  await prisma.user.delete({ where: { id: seedId("youth-user", 1) } });
  await prisma.user.delete({ where: { id: seedId("youth-user", 15) } });
  await prisma.user.create({
    data: {
      email: seedEmail("jovem", 15),
      passwordHash: "outside-seed",
      role: "YOUTH",
    },
  });
  await assert.rejects(seedDatabase(prisma), /conta externa ao seed/);
  assert.equal(await prisma.user.count(), 21);
  assert.equal(
    await prisma.user.findUnique({ where: { id: seedId("youth-user", 1) } }),
    null,
  );
  const secondAdmin = await prisma.user.create({
    data: {
      email: "second-admin@example.com",
      role: "ADMIN",
      passwordHash: "unchanged",
    },
  });
  await assert.rejects(seedDatabase(prisma), /exatamente um ADMIN/);
  assert.deepEqual(
    await prisma.user.findUnique({ where: { id: secondAdmin.id } }),
    secondAdmin,
  );
});
