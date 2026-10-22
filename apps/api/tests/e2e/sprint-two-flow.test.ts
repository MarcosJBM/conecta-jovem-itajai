import { expect, test } from 'vitest';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';
import { account, session } from '../../src/utils/test/session-fixture.js';

test('sprint 2 integrates youth curriculum, administrative validation and direct job publication', async () => {
  const app = createApp();
  const prisma = getDatabaseClient();
  const youth = await account('YOUTH');
  const company = await account('COMPANY');
  const admin = await account('ADMIN');
  const young = await session(app, youth);
  const owner = await session(app, company);
  const manager = await session(app, admin);
  const write = (
    agent: Awaited<ReturnType<typeof session>>,
    path: string,
    data: object,
  ) => agent.post(path).set('X-Requested-With', 'Conecta').send(data);
  expect(
    (
      await young
        .put('/resumes/me')
        .set('X-Requested-With', 'Conecta')
        .send({ skills: ['Organização'], educations: [], experiences: [] })
    ).body.completeness.complete,
  ).toBe(true);
  const pending = (await manager.get('/admin/company-validations')).body
    .items[0];
  expect(pending.company.id).toBe(company.companyProfile!.id);
  expect(
    (
      await write(
        manager,
        `/admin/company-validations/${pending.id}/decision`,
        { status: 'REJECTED', reason: 'Corrigir razão social.' },
      )
    ).status,
  ).toBe(200);
  expect(
    (await owner.get('/companies/me')).body.company.validation.rejectionReason,
  ).toBe('Corrigir razão social.');
  expect(
    (
      await write(owner, '/companies/me/resubmit', {
        cnpj: '12ABC34501DE35',
        legalName: 'Empresa corrigida',
        city: 'Itajaí',
        state: 'SC',
        contactName: 'Ana',
        contactRole: 'RH',
        phone: '47999991234',
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await write(
        manager,
        `/admin/company-validations/${pending.id}/decision`,
        { status: 'APPROVED' },
      )
    ).status,
  ).toBe(200);
  const data = {
    title: 'Aprendiz administrativo',
    description: 'Apoio à equipe',
    requirements: 'Organização',
    city: 'Itajaí',
    state: 'SC',
    area: 'ADMINISTRATION',
    contract: 'APPRENTICESHIP',
    regime: 'ONSITE',
    deadline: '2099-12-31',
  };
  const created = await write(owner, '/companies/me/jobs', data);
  expect(created.status).toBe(201);
  expect(created.body.job.availability).toBe('OPEN');
  const id = created.body.job.id;
  expect(
    (
      await owner
        .put(`/companies/me/jobs/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send({ ...data, title: 'Aprendiz — administrativo' })
    ).status,
  ).toBe(200);
  expect(
    (await write(owner, `/companies/me/jobs/${id}/close`, {})).status,
  ).toBe(200);
  expect(
    (await owner.get(`/companies/me/jobs/${id}`)).body.job.availability,
  ).toBe('CLOSED');
  expect((await young.get('/resumes/me')).body.resume.skills).toEqual([
    'Organização',
  ]);
  expect(await prisma.user.count({ where: { id: company.id } })).toBe(1);
});
