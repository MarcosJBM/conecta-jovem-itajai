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
