import assert from 'node:assert/strict';
import { test } from 'vitest';
import request from 'supertest';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { compare } from 'bcryptjs';
import { createApp } from '../../src/app.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';

test('real HTTP and Prisma persist an atomic registration and reject concurrent duplicates', async (context) => {
  const prisma = getDatabaseClient();
  const email = `registration-${randomUUID()}@example.com`;
  const server = createApp().listen(0, '127.0.0.1');
  context.onTestFinished(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await prisma.user.deleteMany({ where: { email } });
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/companies`;
  const data = {
    email,
    password: 'integration-password',
    cnpj: '12ABC34501DE35',
    legalName: 'Empresa E2E',
    city: 'Itajaí',
    state: 'SC',
    contactName: 'Ana',
    contactRole: 'RH',
    phone: '47999991234',
  };
  const post = (body: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const responses = await Promise.all([post(data), post(data)]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [201, 409],
  );
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { companyProfile: { include: { validation: true } } },
  });
  assert.equal(user.role, 'COMPANY');
  assert.ok(await compare(data.password, user.passwordHash));
  assert.equal(user.companyProfile?.cnpj, data.cnpj);
  assert.equal(user.companyProfile?.validation?.status, 'PENDING');
  assert.equal(user.companyProfile?.validation?.rejectionReason, null);
  assert.equal(await prisma.user.count({ where: { email } }), 1);

  // A unique CNPJ collision must roll back the nested account creation too.
  const secondEmail = `other-${email}`;
  await assert.rejects(
    prisma.user.create({
      data: {
        email: secondEmail,
        passwordHash: 'test',
        role: 'COMPANY',
        companyProfile: {
          create: { cnpj: data.cnpj, validation: { create: {} } },
        },
      },
    }),
    (error: unknown) =>
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002',
  );
  assert.equal(
    await prisma.user.findUnique({ where: { email: secondEmail } }),
    null,
  );

  const validationId = user.companyProfile!.validation!.id;
  await assert.rejects(
    prisma.companyValidation.update({
      where: { id: validationId },
      data: { status: 'REJECTED' },
    }),
  );
  await prisma.companyValidation.update({
    where: { id: validationId },
    data: { status: 'REJECTED', rejectionReason: 'Dados divergentes.' },
  });
  await prisma.user.delete({ where: { id: user.id } });
  assert.equal(
    await prisma.companyValidation.findUnique({ where: { id: validationId } }),
    null,
  );
});

test('company can log in while pending/rejected, view only its status, correct and resubmit once', async () => {
  const app = createApp();
  const prisma = getDatabaseClient();
  const data = {
    email: 'company@example.com',
    password: 'abcdef',
    cnpj: '12ABC34501DE35',
    legalName: 'Empresa teste',
    city: 'Itajaí',
    state: 'SC',
    contactName: 'Ana',
    contactRole: 'RH',
    phone: '47999991234',
  };
  const created = await request(app).post('/companies').send(data);
  assert.equal(created.status, 201);
  const agent = request.agent(app);
  assert.equal(
    (
      await agent
        .post('/auth/login')
        .set('X-Requested-With', 'Conecta')
        .send({ email: data.email, password: data.password })
    ).status,
    200,
  );
  assert.equal(
    (await agent.get('/companies/me')).body.company.validation.status,
    'PENDING',
  );
  assert.equal((await agent.get('/users')).status, 403);
  assert.equal((await request(app).get('/companies/me')).status, 401);
  const { email: _email, password: _password, ...details } = data;
  assert.equal(
    (
      await agent
        .post('/companies/me/resubmit')
        .set('X-Requested-With', 'Conecta')
        .send(details)
    ).status,
    409,
  );
  const id = created.body.company.id;
  await prisma.companyValidation.update({
    where: { companyId: id },
    data: {
      status: 'REJECTED',
      rejectionReason: 'Corrigir razão social.',
      reviewedAt: new Date(),
    },
  });
  assert.equal(
    (await agent.get('/companies/me')).body.company.validation.rejectionReason,
    'Corrigir razão social.',
  );
  assert.equal(
    (
      await agent
        .post('/companies/me/resubmit')
        .set('X-Requested-With', 'Conecta')
        .send({ ...details, userId: 'injected' })
    ).status,
    400,
  );
  // Conflict must roll back the status change as well as the profile change.
  const other = await prisma.user.create({
    data: {
      email: 'other@example.com',
      role: 'COMPANY',
      passwordHash: 'test',
      companyProfile: { create: { cnpj: '12345678000195' } },
    },
  });
  assert.equal(
    (
      await agent
        .post('/companies/me/resubmit')
        .set('X-Requested-With', 'Conecta')
        .send({ ...details, cnpj: '12345678000195' })
    ).status,
    409,
  );
  assert.equal(
    (await agent.get('/companies/me')).body.company.validation.status,
    'REJECTED',
  );
  await prisma.user.delete({ where: { id: other.id } });
  const responses = await Promise.all(
    [1, 2].map(() =>
      agent
        .post('/companies/me/resubmit')
        .set('X-Requested-With', 'Conecta')
        .send({ ...details, legalName: 'Razão corrigida' }),
    ),
  );
  assert.deepEqual(responses.map((item) => item.status).sort(), [200, 409]);
  const saved = (await agent.get('/companies/me')).body.company;
  assert.equal(saved.legalName, 'Razão corrigida');
  assert.equal(saved.validation.status, 'PENDING');
  assert.equal(saved.validation.rejectionReason, null);
  assert.equal(await prisma.user.count({ where: { email: data.email } }), 1);
});
