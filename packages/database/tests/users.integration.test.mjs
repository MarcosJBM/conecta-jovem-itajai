import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

import { closeDatabaseConnection, getPrismaClient } from '../dist/index.js';

const testDirectory = fileURLToPath(new URL('.', import.meta.url));

config({ path: resolve(testDirectory, '../../../.env') });

// TODO: use always english in .test
test('persiste e consulta os três perfis de usuário', async context => {
  const prisma = getPrismaClient();
  const testId = randomUUID();
  const userIds = {
    youth: randomUUID(),
    company: randomUUID(),
    admin: randomUUID(),
    duplicate: randomUUID(),
    replacement: randomUUID(),
  };
  const emails = {
    youth: `youth-${testId}@example.com`,
    company: `company-${testId}@example.com`,
    admin: `admin-${testId}@example.com`,
  };

  context.after(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(userIds) } },
    });
    await closeDatabaseConnection();
  });

  const youth = await prisma.user.create({
    data: {
      id: userIds.youth,
      email: emails.youth,
      passwordHash: 'integration-test-password-hash',
      role: 'YOUTH',
      youthProfile: { create: {} },
    },
    include: { youthProfile: true, companyProfile: true },
  });

  assert.equal(youth.role, 'YOUTH');
  assert.ok(youth.youthProfile);
  assert.equal(youth.companyProfile, null);

  const company = await prisma.user.create({
    data: {
      id: userIds.company,
      email: emails.company,
      passwordHash: 'integration-test-password-hash',
      role: 'COMPANY',
      companyProfile: { create: {} },
    },
    include: { youthProfile: true, companyProfile: true },
  });

  assert.equal(company.role, 'COMPANY');
  assert.ok(company.companyProfile);
  assert.equal(company.youthProfile, null);

  const admin = await prisma.user.create({
    data: {
      id: userIds.admin,
      email: emails.admin,
      passwordHash: 'integration-test-password-hash',
      role: 'ADMIN',
    },
    include: { youthProfile: true, companyProfile: true },
  });

  assert.equal(admin.role, 'ADMIN');
  assert.equal(admin.youthProfile, null);
  assert.equal(admin.companyProfile, null);

  await assert.rejects(
    prisma.user.create({
      data: {
        id: userIds.duplicate,
        email: emails.youth,
        passwordHash: 'another-integration-test-password-hash',
        role: 'ADMIN',
      },
    }),
    error => error?.code === 'P2002',
  );

  const youthProfileId = youth.youthProfile.id;

  await prisma.user.delete({ where: { id: userIds.youth } });

  assert.equal(
    await prisma.youthProfile.findUnique({ where: { id: youthProfileId } }),
    null,
  );

  const replacement = await prisma.user.create({
    data: {
      id: userIds.replacement,
      email: emails.youth,
      passwordHash: 'replacement-integration-test-password-hash',
      role: 'ADMIN',
    },
  });

  assert.equal(replacement.email, emails.youth);
});
