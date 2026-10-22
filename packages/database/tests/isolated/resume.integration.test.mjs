import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { config } from "dotenv";
import pg from "pg";
import { closeDatabaseConnection, getPrismaClient } from "../../dist/index.js";

config({ path: new URL("../../../../.env", import.meta.url), quiet: true });

test("resume migration preserves legacy profiles and isolates professional data", async (context) => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Defina TEST_DATABASE_URL; o teste cria e remove somente seu schema exclusivo.",
  );
  const url = new URL(process.env.TEST_DATABASE_URL);
  const schema = `test_resume_${randomUUID().replaceAll("-", "")}`;
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

  const migrations = new URL("../../prisma/migrations/", import.meta.url);
  const currentMigration = "20261021000000_resume_data";
  for (const name of (await readdir(migrations)).sort()) {
    if (/^\d+_/.test(name) && name < currentMigration) {
      await connection.query(
        await readFile(new URL(`${name}/migration.sql`, migrations), "utf8"),
      );
    }
  }

  // Insert real pre-migration shapes, including a legacy profile with nullable fields.
  const users = [randomUUID(), randomUUID()];
  const profiles = [randomUUID(), randomUUID()];
  for (let i = 0; i < users.length; i++) {
    await connection.query(
      "INSERT INTO users (id, email, password_hash, role, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      [users[i], `resume-${users[i]}@example.com`, "test-hash", "YOUTH"],
    );
    await connection.query(
      'INSERT INTO youth_profiles (id, user_id, "firstName", updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [profiles[i], users[i], i === 0 ? "Ana" : null],
    );
  }
  const before = (
    await connection.query("SELECT * FROM youth_profiles ORDER BY id")
  ).rows;
  await connection.query(
    await readFile(
      new URL(`${currentMigration}/migration.sql`, migrations),
      "utf8",
    ),
  );
  assert.deepEqual(
    (await connection.query("SELECT * FROM youth_profiles ORDER BY id")).rows,
    before,
  );
  assert.equal(
    (await connection.query("SELECT count(*)::int AS count FROM resumes"))
      .rows[0].count,
    0,
  );

  const prisma = getPrismaClient(url.toString());
  const include = { skills: true, educations: true, experiences: true };
  const education = {
    institution: "Escola técnica",
    course: "Informática",
    level: "Técnico",
    startMonth: "2025-02",
    endMonth: null,
    inProgress: true,
  };
  const experience = {
    title: "Aprendiz",
    organization: "Empresa",
    startMonth: "2025-01",
    endMonth: "2025-12",
    isCurrent: false,
    description: null,
  };
  const professionalData = () => ({
    skills: { create: [{ name: "Comunicação" }] },
    educations: { create: [education] },
    experiences: { create: [experience] },
  });

  await context.test(
    "allows an empty draft and one resume per youth",
    async () => {
      const draft = await prisma.resume.create({
        data: { youthProfileId: profiles[0] },
        include,
      });
      assert.deepEqual(draft.skills, []);
      assert.deepEqual(draft.educations, []);
      assert.deepEqual(draft.experiences, []);
      await assert.rejects(
        prisma.resume.create({ data: { youthProfileId: profiles[0] } }),
        { code: "P2002" },
      );
      await assert.rejects(
        prisma.resume.create({ data: { youthProfileId: randomUUID() } }),
        { code: "P2003" },
      );
      await prisma.resume.delete({ where: { id: draft.id } });
    },
  );

  await context.test(
    "rolls back an invalid nested resume instead of leaving partial data",
    async () => {
      await assert.rejects(
        prisma.resume.create({
          data: {
            youthProfileId: profiles[0],
            skills: { create: [{ name: "Comunicação" }] },
            educations: { create: [{ ...education, startMonth: "2025-13" }] },
          },
        }),
      );
      assert.equal(await prisma.resume.count(), 0);
      assert.equal(await prisma.resumeSkill.count(), 0);
    },
  );

  const first = await prisma.resume.create({
    data: { youthProfileId: profiles[0], ...professionalData() },
    include,
  });
  const second = await prisma.resume.create({
    data: { youthProfileId: profiles[1], ...professionalData() },
    include,
  });

  await context.test(
    "persists each collection under the correct youth",
    async () => {
      const saved = await prisma.youthProfile.findUniqueOrThrow({
        where: { id: profiles[0] },
        include: { resume: { include } },
      });
      assert.equal(saved.resume.id, first.id);
      assert.equal(saved.resume.skills[0].name, "Comunicação");
      assert.equal(
        saved.resume.educations[0].institution,
        education.institution,
      );
      assert.equal(saved.resume.educations[0].endMonth, null);
      assert.equal(
        saved.resume.experiences[0].startMonth,
        experience.startMonth,
      );
      assert.equal(saved.resume.experiences[0].description, null);
      await assert.rejects(
        prisma.resumeSkill.create({
          data: { resumeId: first.id, name: "Comunicação" },
        }),
        { code: "P2002" },
      );
    },
  );

  await context.test(
    "rejects blank entries and invalid monthly periods in storage",
    async () => {
      await assert.rejects(
        prisma.resumeSkill.create({
          data: { resumeId: first.id, name: "\t " },
        }),
      );
      for (const changes of [
        { institution: " " },
        { course: "" },
        { level: "\t" },
        { startMonth: "0000-01" },
        { startMonth: "2025-00" },
        { startMonth: "2025-13" },
        { startMonth: "2025-1" },
        { endMonth: "2025-12", inProgress: true },
        { endMonth: null, inProgress: false },
        { endMonth: "2025-01", inProgress: false },
        { endMonth: "2025-13", inProgress: false },
      ]) {
        await assert.rejects(
          prisma.resumeEducation.create({
            data: { resumeId: first.id, ...education, ...changes },
          }),
        );
      }
      for (const changes of [
        { title: " " },
        { organization: "" },
        { startMonth: "0000-01" },
        { startMonth: "2025-13" },
        { endMonth: "2024-12" },
        { endMonth: null },
        { endMonth: "2025-13" },
        { isCurrent: true },
      ]) {
        await assert.rejects(
          prisma.resumeExperience.create({
            data: { resumeId: first.id, ...experience, ...changes },
          }),
        );
      }
      const sameMonth = await prisma.resumeEducation.create({
        data: {
          resumeId: first.id,
          ...education,
          inProgress: false,
          endMonth: education.startMonth,
        },
      });
      await prisma.resumeEducation.delete({ where: { id: sameMonth.id } });
      const ongoing = await prisma.resumeExperience.create({
        data: {
          resumeId: first.id,
          ...experience,
          isCurrent: true,
          endMonth: null,
        },
      });
      await prisma.resumeExperience.delete({ where: { id: ongoing.id } });
    },
  );

  await context.test(
    "updates and removes entries without affecting another youth",
    async () => {
      await prisma.resumeSkill.update({
        where: { id: first.skills[0].id },
        data: { name: "Organização" },
      });
      assert.equal(
        (
          await prisma.resumeSkill.findUniqueOrThrow({
            where: { id: first.skills[0].id },
          })
        ).name,
        "Organização",
      );
      await prisma.resumeEducation.delete({
        where: { id: first.educations[0].id },
      });
      await prisma.resumeExperience.delete({
        where: { id: first.experiences[0].id },
      });
      assert.equal(
        await prisma.resumeEducation.count({ where: { resumeId: first.id } }),
        0,
      );
      assert.equal(
        await prisma.resumeExperience.count({ where: { resumeId: first.id } }),
        0,
      );
      assert.deepEqual(
        await prisma.resume.findUniqueOrThrow({
          where: { id: second.id },
          include,
        }),
        second,
      );
    },
  );

  await context.test(
    "cascades from resume and user without removing another youth data",
    async () => {
      await prisma.resume.delete({ where: { id: first.id } });
      assert.equal(
        await prisma.resumeSkill.count({ where: { resumeId: first.id } }),
        0,
      );
      assert.ok(
        await prisma.youthProfile.findUnique({ where: { id: profiles[0] } }),
      );
      const recreated = await prisma.resume.create({
        data: { youthProfileId: profiles[0], ...professionalData() },
      });
      await prisma.user.delete({ where: { id: users[0] } });
      assert.equal(
        await prisma.youthProfile.findUnique({ where: { id: profiles[0] } }),
        null,
      );
      assert.equal(
        await prisma.resume.findUnique({ where: { id: recreated.id } }),
        null,
      );
      for (const model of [
        prisma.resumeSkill,
        prisma.resumeEducation,
        prisma.resumeExperience,
      ]) {
        assert.equal(
          await model.count({ where: { resumeId: recreated.id } }),
          0,
        );
      }
      assert.deepEqual(
        await prisma.resume.findUniqueOrThrow({
          where: { id: second.id },
          include,
        }),
        second,
      );
    },
  );
});
