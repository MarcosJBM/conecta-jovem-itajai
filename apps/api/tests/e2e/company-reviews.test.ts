import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account, session } from '../../src/utils/test/session-fixture.js';

test('admin reviews pending companies with atomic decisions and same-account resubmission', async () => {
  const app = createApp();
  const prisma = getDatabaseClient();
  const company = await account('COMPANY');
  const admin = await account('ADMIN');
  const agent = await session(app, admin);
  const owner = await session(app, company);
  const id = (
    await prisma.companyValidation.findUniqueOrThrow({
      where: { companyId: company.companyProfile!.id },
    })
  ).id;
  const base = '/admin/company-validations';
  expect((await request(app).get(base)).status).toBe(401);
  expect((await owner.get(base)).status).toBe(403);
  expect((await agent.get(`${base}?page=0`)).status).toBe(400);
  expect((await agent.get(`${base}?page=99&pageSize=1`)).body.items).toEqual(
    [],
  );
  const list = await agent.get(`${base}?pageSize=1`);
  expect(list.body.total).toBe(1);
  expect(list.body.items[0].company.email).toBe(company.email);
  expect(
    (await agent.get(`${base}/${id}`)).body.review.company,
  ).not.toHaveProperty('user');
  expect(
    (
      await agent
        .post(`${base}/${id}/decision`)
        .set('X-Requested-With', 'Conecta')
        .send({ status: 'REJECTED', reason: ' ' })
    ).status,
  ).toBe(400);
  const results = await Promise.all(
    [1, 2].map(() =>
      agent
        .post(`${base}/${id}/decision`)
        .set('X-Requested-With', 'Conecta')
        .send({ status: 'REJECTED', reason: 'Corrigir razão social.' }),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  const rejected = await prisma.companyValidation.findUniqueOrThrow({
    where: { id },
  });
  expect(rejected.reviewedById).toBe(admin.id);
  expect(rejected.reviewedAt).toBeInstanceOf(Date);
  expect((await agent.get(base)).body.total).toBe(0);
  expect(
    (await owner.get('/companies/me')).body.company.validation.rejectionReason,
  ).toBe('Corrigir razão social.');
  const resubmit = await owner
    .post('/companies/me/resubmit')
    .set('X-Requested-With', 'Conecta')
    .send({
      legalName: 'Razão corrigida',
      cnpj: '12ABC34501DE35',
      city: 'Itajaí',
      state: 'SC',
      contactName: 'Ana',
      contactRole: 'RH',
      phone: '47999991234',
    });
  expect(resubmit.status).toBe(200);
  expect((await agent.get(base)).body.total).toBe(1);
  expect(
    (
      await agent
        .post(`${base}/${id}/decision`)
        .set('X-Requested-With', 'Conecta')
        .send({ status: 'APPROVED', reviewedById: company.id })
    ).status,
  ).toBe(400);
  expect(
    (
      await agent
        .post(`${base}/${id}/decision`)
        .set('X-Requested-With', 'Conecta')
        .send({ status: 'APPROVED' })
    ).status,
  ).toBe(200);
  expect(
    (await owner.get('/companies/me')).body.company.validation.status,
  ).toBe('APPROVED');
  expect(
    (await agent.get(`${base}/${id}`)).body.review.rejectionReason,
  ).toBeNull();
});
