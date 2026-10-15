import assert from 'node:assert/strict';
import { test } from 'vitest';
import { once } from 'node:events';
import { hash, compare } from 'bcryptjs';
import { createApp } from '../src/app.js';
import { isValidCnpj } from '../src/domain/cnpj.js';
import { InMemoryCompaniesRepository } from '../src/repositories/in-memory/in-memory-companies-repository.js';
import { RegisterCompanyUseCase } from '../src/use-cases/register-company.js';

const valid = {
  email: 'company@example.com',
  password: 'strong-password',
  cnpj: '12.ABC.345/01DE-35',
  legalName: 'Empresa de Teste',
  city: 'Itajaí',
  state: 'SC',
  contactName: 'Ana',
  contactRole: 'RH',
  phone: '(47) 99999-1234',
};

test('validates numeric and official alphanumeric CNPJ examples', () => {
  for (const cnpj of [
    '12.ABC.345/01DE-35',
    '12.345.678/0001-95',
    '12.abc.345/01de-35',
    '00.000.000/0001-91',
  ])
    assert.ok(isValidCnpj(cnpj));
  for (const cnpj of [
    '00.000.000/0000-00',
    '11.111.111/1111-11',
    '12.ABC.345/01DE-34',
    '12!ABC34501DE35',
    '12ABC34501DE3A',
  ])
    assert.equal(isValidCnpj(cnpj), false);
});

test('HTTP registration validates input, persists hash and pending status, and handles conflicts', async (context) => {
  const repository = new InMemoryCompaniesRepository();
  const app = createApp(
    () =>
      new RegisterCompanyUseCase(repository, {
        hash: (password) => hash(password, 4),
      }),
  );
  const server = app.listen(0, '127.0.0.1');
  context.onTestFinished(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/companies`;
  const post = (body: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const invalid = await post({});
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).fields.email);
  assert.equal(repository.items.length, 0);
  for (const patch of [
    { cnpj: 'invalid' },
    { state: 'XX' },
    { password: 'á'.repeat(37) },
    { phone: 'abc47999991234' },
    { role: 'ADMIN' },
    { legalName: '   ' },
  ]) {
    assert.equal((await post({ ...valid, ...patch })).status, 400);
  }
  assert.equal(repository.items.length, 0);

  const response = await post({
    ...valid,
    email: ' COMPANY@EXAMPLE.COM ',
    tradeName: '',
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.company.validation.status, 'PENDING');
  assert.equal(repository.items.length, 1);
  const saved = repository.items[0]!;
  assert.equal(saved.email, 'company@example.com');
  assert.equal(saved.cnpj, '12ABC34501DE35');
  assert.equal(saved.phone, '47999991234');
  assert.ok(await compare(valid.password, saved.passwordHash));
  assert.equal('password' in saved, false);
  assert.equal(JSON.stringify(body).includes(saved.passwordHash), false);
  assert.equal(body.company.userId, saved.userId);

  const duplicateEmail = await post({ ...valid, cnpj: '12345678000195' });
  assert.equal(duplicateEmail.status, 409);
  assert.ok((await duplicateEmail.json()).fields.email);
  const duplicateCnpj = await post({
    ...valid,
    email: 'other@example.com',
    cnpj: '12abc34501de35',
  });
  assert.equal(duplicateCnpj.status, 409);
  assert.ok((await duplicateCnpj.json()).fields.cnpj);
  assert.equal(repository.items.length, 1);

  const malformed = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await fetch(url.replace('/companies', '/health'))).status, 200);
});

test('hash failure leaves no partial registration', async () => {
  const repository = new InMemoryCompaniesRepository();
  const useCase = new RegisterCompanyUseCase(repository, {
    hash: async () => {
      throw new Error('hash failed');
    },
  });
  await assert.rejects(useCase.execute(valid), /hash failed/);
  assert.equal(repository.items.length, 0);
});
