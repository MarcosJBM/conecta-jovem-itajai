import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../../../app.js';
import { getDatabaseClient } from '../../../libs/prisma.js';
import { testCpf, userInput } from '../../../utils/test/user-fixture.js';
describe('Users HTTP → Prisma → isolated PostgreSQL', () => {
  it.each(['YOUTH', 'COMPANY'])(
    'creates a %s profile without exposing credentials',
    async (role) => {
      const response = await request(app)
        .post('/users')
        .send({ ...userInput, role });
      expect(response.status).toBe(201);
      expect(response.body.user).not.toHaveProperty('passwordHash');
      const user = await getDatabaseClient().user.findUniqueOrThrow({
        where: { id: response.body.user.id },
        include: { youthProfile: true, companyProfile: true },
      });
      expect(user.passwordHash).toMatch(/^scrypt:/);
      expect(user.passwordHash).not.toContain(userInput.password);
      expect(user.youthProfile !== null).toBe(role === 'YOUTH');
      expect(user.companyProfile !== null).toBe(role === 'COMPANY');
    },
  );
  it('persists complete normalized youth data with a six-character password', async () => {
    const response = await request(app)
      .post('/users')
      .send({ ...userInput, password: 'abcdef' });
    expect(response.status).toBe(201);
    const stored = await getDatabaseClient().user.findUniqueOrThrow({
      where: { id: response.body.user.id },
      include: { youthProfile: true },
    });
    expect(stored.youthProfile).toMatchObject({
      firstName: 'Ana',
      lastName: 'Silva',
      cpf: '52998224725',
      phone: '47999991234',
      postalCode: '88301000',
      street: 'Rua Central',
      number: '123',
      complement: 'Casa',
      neighborhood: 'Centro',
      city: 'Itajaí',
      state: 'SC',
      birthDate: new Date('2005-03-12T00:00:00Z'),
    });
    expect(response.body.user.youthProfile).not.toHaveProperty('cpf');
    expect(response.body.user.youthProfile).not.toHaveProperty('street');
  });
  it('enforces CPF uniqueness under concurrent requests with different emails', async () => {
    const responses = await Promise.all(
      ['one@example.com', 'two@example.com'].map((email) =>
        request(app)
          .post('/users')
          .send({ ...userInput, email }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(
      responses.find((response) => response.status === 409)?.body.message,
    ).toBe('CPF já cadastrado.');
    expect(await getDatabaseClient().user.count()).toBe(1);
    expect(await getDatabaseClient().youthProfile.count()).toBe(1);
  });
  it.each([
    { acceptedTerms: false },
    { acceptedTerms: undefined },
    { youthProfile: undefined },
    { youthProfile: { ...userInput.youthProfile, cpf: '11111111111' } },
    { youthProfile: { ...userInput.youthProfile, complement: '' } },
  ])('rejects invalid youth input atomically %j', async (change) => {
    const response = await request(app)
      .post('/users')
      .send({ ...userInput, ...change });
    expect(response.status).toBe(400);
    expect(await getDatabaseClient().user.count()).toBe(0);
    expect(await getDatabaseClient().youthProfile.count()).toBe(0);
  });
  it('gets, lists, patches, replaces and deletes a user, cascading the profile', async () => {
    const created = await request(app).post('/users').send(userInput);
    const id = created.body.user.id;
    const individual = await request(app).get(`/users/${id}`);
    expect(individual.status).toBe(200);
    expect(individual.body).toEqual(created.body);
    const listed = await request(app).get('/users?page=1&pageSize=1');
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({
      total: 1,
      totalPages: 1,
      items: [created.body.user],
    });
    expect(
      (
        await request(app)
          .patch(`/users/${id}`)
          .send({ email: 'updated@example.com' })
      ).status,
    ).toBe(200);
    expect(
      (await getDatabaseClient().user.findUniqueOrThrow({ where: { id } }))
        .email,
    ).toBe('updated@example.com');
    expect(
      (
        await request(app)
          .put(`/users/${id}`)
          .send({ email: 'replaced@example.com', password: 'new-password' })
      ).status,
    ).toBe(200);
    expect(
      (await getDatabaseClient().user.findUniqueOrThrow({ where: { id } }))
        .email,
    ).toBe('replaced@example.com');
    expect((await request(app).delete(`/users/${id}`)).status).toBe(204);
    expect(
      await getDatabaseClient().user.findUnique({ where: { id } }),
    ).toBeNull();
    expect(await getDatabaseClient().youthProfile.count()).toBe(0);
    expect((await request(app).get(`/users/${id}`)).status).toBe(404);
  });
  it('lists in stable pages without repeated rows', async () => {
    for (let i = 0; i < 3; i++)
      await request(app)
        .post('/users')
        .send({
          ...userInput,
          youthProfile: { ...userInput.youthProfile, cpf: testCpf(i) },
          email: `user${i}@example.com`,
        });
    const first = await request(app).get('/users?pageSize=2');
    const second = await request(app).get('/users?pageSize=2&page=2');
    expect(first.body.total).toBe(3);
    expect(second.body.items).toHaveLength(1);
    expect(
      new Set(
        [...first.body.items, ...second.body.items].map((user) => user.id),
      ).size,
    ).toBe(3);
    expect((await request(app).get('/users?pageSize=2')).body).toEqual(
      first.body,
    );
  });
  it.each(['get', 'patch', 'put', 'delete'] as const)(
    'returns 404 for a missing user (%s)',
    async (method) => {
      const operation = request(app)[method](`/users/${randomUUID()}`);
      const response = await operation.send({
        email: 'new@example.com',
        password: 'new-password',
      });
      expect(response.status).toBe(404);
    },
  );
  it('rejects duplicate registration and update, leaving records unchanged', async () => {
    const created = await request(app).post('/users').send(userInput);
    expect(
      (
        await request(app)
          .post('/users')
          .send({ ...userInput, email: 'YOUNG@example.com' })
      ).status,
    ).toBe(409);
    const other = await request(app)
      .post('/users')
      .send({
        ...userInput,
        youthProfile: { ...userInput.youthProfile, cpf: testCpf(100) },
        email: 'other@example.com',
      });
    expect(
      (
        await request(app)
          .patch(`/users/${other.body.user.id}`)
          .send({ email: userInput.email })
      ).status,
    ).toBe(409);
    expect(
      (
        await getDatabaseClient().user.findUniqueOrThrow({
          where: { id: other.body.user.id },
        })
      ).email,
    ).toBe('other@example.com');
    expect(created.status).toBe(201);
    expect(await getDatabaseClient().user.count()).toBe(2);
  });
  it('maps concurrent database uniqueness conflicts to 409', async () => {
    const responses = await Promise.all([
      request(app).post('/users').send(userInput),
      request(app).post('/users').send(userInput),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await getDatabaseClient().user.count()).toBe(1);
  });
  it.each([
    { email: 'bad' },
    { password: 'short' },
    { role: 'INVALID' },
    { extra: true },
    { passwordHash: 'injected' },
  ])('rejects invalid registration %j', async (change) => {
    expect(
      (
        await request(app)
          .post('/users')
          .send({ ...userInput, ...change })
      ).status,
    ).toBe(400);
    expect(await getDatabaseClient().user.count()).toBe(0);
  });
  it('forbids public ADMIN registration', async () => {
    expect(
      (
        await request(app)
          .post('/users')
          .send({ ...userInput, role: 'ADMIN' })
      ).status,
    ).toBe(403);
    expect(await getDatabaseClient().user.count()).toBe(0);
  });
  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=abc',
    'pageSize=0',
    'pageSize=101',
    'page=1&page=2',
    'unknown=1',
  ])('rejects invalid query %s', async (query) => {
    expect((await request(app).get(`/users?${query}`)).status).toBe(400);
  });
  it('validates UUID, partial/complete bodies, immutable roles and does not mutate on failure', async () => {
    expect((await request(app).get('/users/bad-id')).status).toBe(400);
    const created = await request(app).post('/users').send(userInput);
    const id = created.body.user.id;
    for (const changes of [
      {},
      { email: 'bad' },
      { password: '' },
      { role: 'ADMIN' },
    ])
      expect(
        (await request(app).patch(`/users/${id}`).send(changes)).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/users/${id}`)
          .send({ email: 'new@example.com' })
      ).status,
    ).toBe(400);
    expect((await request(app).get(`/users/${id}`)).body).toEqual(created.body);
  });
  it('preserves health checks and returns JSON for unmatched routes and malformed JSON', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
    expect((await request(app).get('/health/database')).body).toEqual({
      status: 'ok',
      database: 'connected',
    });
    expect((await request(app).get('/missing')).status).toBe(404);
    expect(
      (
        await request(app)
          .post('/users')
          .set('Content-Type', 'application/json')
          .send('{')
      ).status,
    ).toBe(400);
  });
  it('logs unexpected persistence errors and returns a sanitized 500', async () => {
    const spy = vi
      .spyOn(getDatabaseClient().user, 'findMany')
      .mockRejectedValueOnce(new Error('private database details'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app).get('/users');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Erro interno do servidor.' });
      expect(log).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      log.mockRestore();
    }
  });
});
