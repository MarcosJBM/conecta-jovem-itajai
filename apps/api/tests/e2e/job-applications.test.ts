import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account, session } from '../../src/utils/test/session-fixture.js';

async function setupApplication() {
  const app = createApp();
  const prisma = getDatabaseClient();
  const company = await account('COMPANY');
  const candidate = await account('YOUTH');
  const youth = await session(app, candidate);
  const job = await prisma.job.create({
    data: {
      companyId: company.companyProfile!.id,
      title: 'Aprendiz',
      description: 'Apoio administrativo',
      requirements: 'Organização',
      city: 'Itajaí',
      state: 'SC',
      area: 'ADMINISTRATION',
      contract: 'APPRENTICESHIP',
      regime: 'ONSITE',
      deadline: new Date('2099-12-31'),
    },
  });
  const detailsPath = `/jobs/${job.id}`;
  const path = `${detailsPath}/applications`;
  const apply = () => youth.post(path).set('X-Requested-With', 'Conecta');
  const saveResume = (skill: string) =>
    youth
      .put('/resumes/me')
      .set('X-Requested-With', 'Conecta')
      .send({
        skills: [skill],
        educations: [],
        experiences: [],
      });

  return {
    app,
    prisma,
    company,
    candidate,
    youth,
    job,
    path,
    detailsPath,
    apply,
    saveResume,
  };
}

test('serializes duplicate submissions and preserves the structured resume sent by the youth', async () => {
  const { app, prisma, candidate, youth, job, detailsPath, apply, saveResume } =
    await setupApplication();
  expect((await saveResume('Organização')).status).toBe(200);
  const resume = (await youth.get('/resumes/me')).body.resume;
  const [first, second] = await Promise.all([apply(), apply()]);
  expect([first.status, second.status].sort()).toEqual([201, 409]);
  const receipt = (first.status === 201 ? first : second).body.application;
  const applications = await prisma.jobApplication.findMany({
    where: { jobId: job.id },
  });
  expect(applications).toHaveLength(1);
  expect(applications[0]).toEqual({
    ...receipt,
    submittedAt: new Date(receipt.submittedAt),
    jobId: job.id,
    youthProfileId: candidate.youthProfile!.id,
    resumeSnapshot: resume,
  });
  expect(receipt).not.toHaveProperty('resumeSnapshot');
  expect((await saveResume('Comunicação')).status).toBe(200);
  expect(
    await prisma.jobApplication.findUnique({ where: { id: receipt.id } }),
  ).toMatchObject({ resumeSnapshot: resume });
  expect((await youth.get(detailsPath)).body.application).toEqual(receipt);
  const other = await session(app, await account('YOUTH', 2));
  expect((await other.get(detailsPath)).body.application).toBeNull();
});

test('blocks incomplete profiles, unavailable jobs, impersonation and unauthorized writes', async () => {
  const {
    app,
    prisma,
    company,
    candidate,
    youth,
    job,
    path,
    apply,
    saveResume,
  } = await setupApplication();
  expect((await request(app).post(path)).status).toBe(401);
  for (const user of [company, await account('ADMIN')]) {
    const forbidden = await session(app, user);
    expect(
      (await forbidden.post(path).set('X-Requested-With', 'Conecta')).status,
    ).toBe(403);
  }
  expect((await youth.post(path)).status).toBe(403);
  expect((await apply().set('Origin', 'https://example.com')).status).toBe(403);
  expect((await apply().send({ userId: candidate.id })).status).toBe(400);
  expect((await apply()).status).toBe(400);

  expect((await saveResume('Organização')).status).toBe(200);
  await prisma.youthProfile.update({
    where: { userId: candidate.id },
    data: { phone: null },
  });
  expect((await apply()).status).toBe(400);
  await prisma.youthProfile.update({
    where: { userId: candidate.id },
    data: { phone: candidate.youthProfile!.phone },
  });

  for (const data of [
    { deadline: new Date('2000-01-01') },
    { status: 'CLOSED' as const },
  ]) {
    await prisma.job.update({ where: { id: job.id }, data });
    expect((await apply()).status).toBe(409);
  }
  await prisma.job.delete({ where: { id: job.id } });
  expect((await apply()).status).toBe(404);
  expect(await prisma.jobApplication.count()).toBe(0);
});
