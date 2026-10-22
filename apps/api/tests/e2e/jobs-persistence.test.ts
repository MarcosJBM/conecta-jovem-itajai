import { expect, test } from 'vitest';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account } from '../../src/utils/test/session-fixture.js';
import { normalizeJob } from '../../src/use-cases/validate-job.js';

test('persists formal job fields with direct-open status and cascades only its company jobs', async () => {
  const prisma = getDatabaseClient();
  const first = await account('COMPANY');
  const other = await account('COMPANY', 2);
  const data = normalizeJob({
    title: 'Aprendiz',
    description: 'Apoio administrativo',
    requirements: 'Organização',
    city: 'Itajaí',
    state: 'SC',
    area: 'ADMINISTRATION',
    contract: 'APPRENTICESHIP',
    regime: 'ONSITE',
    deadline: '2099-12-31',
  });
  const job = await prisma.job.create({
    data: { ...data, companyId: first.companyProfile!.id },
  });
  const retained = await prisma.job.create({
    data: { ...data, companyId: other.companyProfile!.id },
  });
  expect(job.status).toBe('OPEN');
  expect(job.deadline.toISOString().slice(0, 10)).toBe('2099-12-31');
  expect(job.contract).toBe('APPRENTICESHIP');
  expect(job.regime).toBe('ONSITE');
  await expect(
    prisma.job.create({
      data: { ...data, companyId: first.companyProfile!.id, title: ' ' },
    }),
  ).rejects.toThrow();
  await prisma.user.delete({ where: { id: first.id } });
  expect(await prisma.job.findUnique({ where: { id: job.id } })).toBeNull();
  expect(await prisma.job.findUnique({ where: { id: retained.id } })).toEqual(
    retained,
  );
});
