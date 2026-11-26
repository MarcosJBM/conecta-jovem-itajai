import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account, session } from '../../src/utils/test/session-fixture.js';

async function setup() {
  const app = createApp();
  const prisma = getDatabaseClient();
  const company = await account('COMPANY');
  const other = await account('COMPANY', 2);
  const candidate = await account('YOUTH');
  const youth = await session(app, candidate);
  const owner = await session(app, company);
  const foreign = await session(app, other);
  const data = {
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
  } as const;
  const job = await prisma.job.create({ data });
  const emptyJob = await prisma.job.create({ data });
  const saveResume = (skill: string) =>
    youth
      .put('/resumes/me')
      .set('X-Requested-With', 'Conecta')
      .send({ skills: [skill], educations: [], experiences: [] });
  expect((await saveResume('Organização')).status).toBe(200);
  const applied = await youth
    .post(`/jobs/${job.id}/applications`)
    .set('X-Requested-With', 'Conecta');
  expect(applied.status).toBe(201);
  const receipt = applied.body.application;
  const path = `/companies/me/jobs/${job.id}/applications`;
  const emptyPath = `/companies/me/jobs/${emptyJob.id}/applications`;
  const detail = `${path}/${receipt.id}`;
  return {
    app,
    prisma,
    company,
    owner,
    foreign,
    youth,
    job,
    path,
    emptyPath,
    detail,
    receipt,
    saveResume,
  };
}

test('company sees its own candidates and the submitted resume even after closing the vacancy', async () => {
  const {
    app,
    prisma,
    owner,
    foreign,
    youth,
    job,
    path,
    emptyPath,
    detail,
    receipt,
    saveResume,
  } = await setup();
  expect((await request(app).get(path)).status).toBe(401);
  expect((await youth.get(path)).status).toBe(403);
  expect((await foreign.get(path)).status).toBe(404);
  expect((await foreign.get(detail)).status).toBe(404);
  expect((await owner.get(`${emptyPath}/${receipt.id}`)).status).toBe(404);
  expect((await owner.get(emptyPath)).body).toMatchObject({
    items: [],
    total: 0,
  });
  expect(
    (await owner.get(path).query({ page: 2, pageSize: 1 })).body,
  ).toMatchObject({ items: [], total: 1, totalPages: 1 });
  const before = (await youth.get('/resumes/me')).body.resume;
  expect((await saveResume('Comunicação')).status).toBe(200);
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'CLOSED', deadline: new Date('2000-01-01') },
  });
  expect((await owner.get(path)).body.items).toEqual([
    {
      ...receipt,
      candidateName: `${before.personalDetails.firstName} ${before.personalDetails.lastName}`,
    },
  ]);
  expect((await owner.get(detail)).body.application).toEqual({
    ...receipt,
    resumeSnapshot: before,
    status: 'RECEIVED',
    nextStatuses: ['IN_REVIEW'],
  });
});

test.each(['APPROVED', 'REJECTED'] as const)(
  'records each permitted transition through %s and preserves previous events',
  async (decision) => {
    const {
      app,
      prisma,
      company,
      owner,
      foreign,
      youth,
      detail,
      job,
      receipt,
    } = await setup();
    const url = `${detail}/status`;
    const change = (status: string) =>
      owner.patch(url).set('X-Requested-With', 'Conecta').send({ status });
    expect((await request(app).patch(url)).status).toBe(401);
    expect(
      (
        await youth
          .patch(url)
          .set('X-Requested-With', 'Conecta')
          .send({ status: 'IN_REVIEW' })
      ).status,
    ).toBe(403);
    expect((await owner.patch(url).send({ status: 'IN_REVIEW' })).status).toBe(
      403,
    );
    expect(
      (
        await foreign
          .patch(url)
          .set('X-Requested-With', 'Conecta')
          .send({ status: 'IN_REVIEW' })
      ).status,
    ).toBe(404);
    expect((await change('UNKNOWN')).status).toBe(400);
    expect((await change(decision)).status).toBe(409);
    expect(await prisma.jobApplicationStatusChange.count()).toBe(0);

    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'CLOSED' },
    });
    const review = await change('IN_REVIEW');
    expect(review.status).toBe(200);
    expect(review.body).toEqual({
      status: 'IN_REVIEW',
      nextStatuses: ['APPROVED', 'REJECTED'],
    });
    expect((await change('RECEIVED')).status).toBe(409);
    expect((await change(decision)).body).toEqual({
      status: decision,
      nextStatuses: [],
    });
    expect((await change('IN_REVIEW')).status).toBe(409);
    expect((await owner.get(detail)).body.application).toMatchObject({
      status: decision,
      nextStatuses: [],
    });
    const history = await prisma.jobApplicationStatusChange.findMany({
      where: { applicationId: receipt.id },
    });
    expect(history).toHaveLength(2);
    expect(history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          previousStatus: 'RECEIVED',
          newStatus: 'IN_REVIEW',
          companyId: company.companyProfile!.id,
          changedAt: expect.any(Date),
        }),
        expect.objectContaining({
          previousStatus: 'IN_REVIEW',
          newStatus: decision,
          companyId: company.companyProfile!.id,
          changedAt: expect.any(Date),
        }),
      ]),
    );
  },
);
