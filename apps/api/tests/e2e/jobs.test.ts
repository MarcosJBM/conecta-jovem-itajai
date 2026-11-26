import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account, session } from '../../src/utils/test/session-fixture.js';

test('company creates directly, manages only its jobs and cannot reopen expired/closed jobs', async () => {
  const app = createApp();
  const prisma = getDatabaseClient();
  const base = '/companies/me/jobs';
  const company = await account('COMPANY');
  const other = await account('COMPANY', 2);
  const owner = await session(app, company);
  const foreign = await session(app, other);
  const data = {
    title: 'Aprendiz',
    description: 'Apoio administrativo',
    requirements: 'Organização',
    city: 'Itajaí',
    state: 'SC',
    area: 'ADMINISTRATION',
    contract: 'APPRENTICESHIP',
    regime: 'ONSITE',
    deadline: '2099-12-31',
  };
  expect((await request(app).get(base)).status).toBe(401);
  expect(
    (await owner.post(base).set('X-Requested-With', 'Conecta').send(data))
      .status,
  ).toBe(403);
  for (const role of ['ADMIN', 'YOUTH'] as const) {
    const forbidden = await session(app, await account(role));
    expect((await forbidden.get(base)).status).toBe(403);
    expect(
      (await forbidden.post(base).set('X-Requested-With', 'Conecta').send(data))
        .status,
    ).toBe(403);
  }
  await prisma.companyValidation.updateMany({ data: { status: 'APPROVED' } });
  expect(
    (await owner.get(`${base}/options`)).body.options.contracts,
  ).toHaveLength(3);
  for (const invalid of [
    { ...data, status: 'OPEN' },
    { ...data, companyId: other.companyProfile!.id },
    { ...data, deadline: '2000-01-01' },
    { ...data, deadline: '2099-02-30' },
    { ...data, contract: 'INFORMAL' },
    { ...data, state: 'XX' },
  ]) {
    expect(
      (await owner.post(base).set('X-Requested-With', 'Conecta').send(invalid))
        .status,
    ).toBe(400);
  }
  expect(await prisma.job.count()).toBe(0);
  const created = await owner
    .post(base)
    .set('X-Requested-With', 'Conecta')
    .send(data);
  expect(created.status).toBe(201);
  const id = created.body.job.id;
  expect(created.body.job.status).toBe('OPEN');
  expect(created.body.job.availability).toBe('OPEN');
  expect((await owner.get(base)).body.total).toBe(1);
  expect((await foreign.get(base)).body.total).toBe(0);
  expect((await owner.get(`${base}?page=99&pageSize=1`)).body.items).toEqual(
    [],
  );
  expect((await owner.get(`${base}?page=-1`)).status).toBe(400);
  expect((await foreign.get(`${base}/${id}`)).status).toBe(404);
  expect(
    (
      await foreign
        .put(`${base}/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send(data)
    ).status,
  ).toBe(404);
  expect(
    (
      await foreign
        .post(`${base}/${id}/close`)
        .set('X-Requested-With', 'Conecta')
        .send({})
    ).status,
  ).toBe(404);
  expect(
    (
      await owner
        .put(`${base}/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send({ ...data, title: 'Vaga atualizada' })
    ).status,
  ).toBe(200);
  const closed = await Promise.all(
    [1, 2].map(() =>
      owner
        .post(`${base}/${id}/close`)
        .set('X-Requested-With', 'Conecta')
        .send({}),
    ),
  );
  expect(closed.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    (
      await owner
        .put(`${base}/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send(data)
    ).status,
  ).toBe(409);
  const expiring = await owner
    .post(base)
    .set('X-Requested-With', 'Conecta')
    .send(data);
  await prisma.job.update({
    where: { id: expiring.body.job.id },
    data: { deadline: new Date('2000-01-01') },
  });
  expect(
    (await owner.get(`${base}/${expiring.body.job.id}`)).body.job.availability,
  ).toBe('EXPIRED');
  expect(
    (
      await owner
        .put(`${base}/${expiring.body.job.id}`)
        .set('X-Requested-With', 'Conecta')
        .send(data)
    ).status,
  ).toBe(409);
  expect(
    (
      await owner
        .post(base)
        .set('X-Requested-With', 'Conecta')
        .set('Origin', 'https://external.example')
        .send(data)
    ).status,
  ).toBe(403);
});

test('youth searches open jobs using literal keywords, combined filters and pagination', async () => {
  const app = createApp();
  const prisma = getDatabaseClient();
  const company = await account('COMPANY');
  const youth = await session(app, await account('YOUTH'));
  const owner = await session(app, company);
  const data = {
    companyId: company.companyProfile!.id,
    title: 'Aprendiz',
    description: 'Apoio administrativo',
    requirements: 'Noções de Excel (100%)',
    city: 'Itajaí',
    state: 'SC',
    area: 'ADMINISTRATION',
    contract: 'APPRENTICESHIP',
    regime: 'ONSITE',
    deadline: new Date('2099-12-31'),
  } as const;
  await prisma.companyProfile.update({
    where: { id: data.companyId },
    data: { tradeName: 'Empresa de teste' },
  });
  const open = await prisma.job.create({ data });
  await prisma.job.createMany({
    data: [
      { ...data, status: 'CLOSED' },
      { ...data, deadline: new Date('2000-01-01') },
      { ...data, city: 'Blumenau', regime: 'REMOTE' },
    ],
  });

  expect((await request(app).get('/jobs')).status).toBe(401);
  expect((await owner.get('/jobs')).status).toBe(403);
  expect((await youth.get('/jobs').query({ regime: 'INVALID' })).status).toBe(
    400,
  );

  for (const keyword of [' APRENDIZ ', 'administrativo', 'EXCEL', '100%']) {
    const response = await youth.get('/jobs').query({
      keyword,
      city: 'ITAJAÍ',
      area: 'ADMINISTRATION',
      contract: 'APPRENTICESHIP',
      regime: 'ONSITE',
      page: 1,
      pageSize: 1,
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [{ id: open.id, companyName: 'Empresa de teste' }],
      total: 1,
      page: 1,
      totalPages: 1,
    });
  }
  expect((await youth.get('/jobs').query({ keyword: '_' })).body.total).toBe(0);
  const secondPage = await youth.get('/jobs').query({ page: 2, pageSize: 1 });
  expect(secondPage.body).toMatchObject({ total: 2, totalPages: 2, page: 2 });
  expect(secondPage.body.items).toHaveLength(1);
});
