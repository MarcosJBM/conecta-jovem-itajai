import request from 'supertest';
import { randomUUID, scryptSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from '../../../env.js';
import { beforeAll, expect, it } from 'vitest';
import { app } from '../../../app.js';
import { getDatabaseClient } from '../../../libs/prisma.js';
import { BcryptPasswordHasher } from '../../../libs/password-hasher.js';
import { userInput } from '../../../utils/test/user-fixture.js';
let adminHash: string;
beforeAll(async () => {
  adminHash = await new BcryptPasswordHasher().hash('abcdef');
});
async function admin() {
  await getDatabaseClient().user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  const agent = request.agent(app);
  expect(
    (
      await agent
        .post('/auth/login')
        .set('X-Requested-With', 'Conecta')
        .send({ email: 'admin@example.com', password: 'abcdef' })
    ).status,
  ).toBe(200);
  return agent;
}
it('creates youth with six characters and no complement, keeping private data out of public responses', async () => {
  const { complement: _complement, ...youthProfile } = userInput.youthProfile;
  const response = await request(app)
    .post('/users')
    .send({ ...userInput, password: 'abcdef', youthProfile });
  expect(response.status).toBe(201);
  expect(response.body.user).not.toHaveProperty('passwordHash');
  expect(response.body.user.youthProfile).not.toHaveProperty('cpf');
  const stored = await getDatabaseClient().user.findUniqueOrThrow({
    where: { id: response.body.user.id },
    include: { youthProfile: true },
  });
  expect(stored.passwordHash).toMatch(/^\$2b\$/);
  expect(stored.youthProfile?.complement).toBe('');
});
it.each([
  { acceptedTerms: false },
  { youthProfile: undefined },
  { password: 'short' },
  { password: 'á'.repeat(37) },
  { youthProfile: { ...userInput.youthProfile, cpf: '11111111111' } },
])('rejects invalid registration atomically: %j', async (change) => {
  expect(
    (
      await request(app)
        .post('/users')
        .send({ ...userInput, ...change })
    ).status,
  ).toBe(400);
  expect(await getDatabaseClient().user.count()).toBe(0);
});
it.each(['ADMIN', 'COMPANY'])(
  'forbids public %s creation through users',
  async (role) => {
    expect(
      (
        await request(app)
          .post('/users')
          .send({ ...userInput, role })
      ).status,
    ).toBe(403);
    expect(await getDatabaseClient().user.count()).toBe(0);
  },
);
it('enforces login, ownership and administrator permissions', async () => {
  const created = await request(app).post('/users').send(userInput);
  const id = created.body.user.id;
  expect((await request(app).get('/users')).status).toBe(401);
  expect((await request(app).get(`/users/${id}`)).status).toBe(401);
  const young = request.agent(app);
  const login = await young
    .post('/auth/login')
    .set('X-Requested-With', 'Conecta')
    .send({ email: userInput.email, password: userInput.password });
  expect(login.status).toBe(200);
  const cookie = login.headers['set-cookie']![0]!;
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Max-Age=86400');
  expect(login.body).not.toHaveProperty('token');
  expect((await young.get('/auth/me')).body.user.role).toBe('YOUTH');
  expect((await young.get(`/users/${id}`)).status).toBe(200);
  expect((await young.get('/users')).status).toBe(403);
  expect((await young.get(`/users/${randomUUID()}`)).status).toBe(403);
  expect(
    (await young.delete(`/users/${id}`).set('X-Requested-With', 'Conecta'))
      .status,
  ).toBe(403);
  expect(
    (
      await young
        .patch(`/users/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send({ email: 'other@example.com' })
    ).status,
  ).toBe(403);
  expect(
    (await young.post('/auth/logout').set('X-Requested-With', 'Conecta'))
      .status,
  ).toBe(204);
  expect(
    (await request(app).get('/auth/me').set('Cookie', cookie)).status,
  ).toBe(401);
});
it('supports admin CRUD while invalidating sessions after a password change', async () => {
  const agent = await admin();
  const created = await request(app).post('/users').send(userInput);
  const id = created.body.user.id;
  const young = request.agent(app);
  await young
    .post('/auth/login')
    .set('X-Requested-With', 'Conecta')
    .send({ email: userInput.email, password: userInput.password });
  expect((await agent.get('/users?page=1&pageSize=1')).body.total).toBe(2);
  expect((await agent.get(`/users/${id}`)).status).toBe(200);
  expect(
    (
      await agent
        .patch(`/users/${id}`)
        .set('X-Requested-With', 'Conecta')
        .send({ password: 'abcdef' })
    ).status,
  ).toBe(200);
  expect((await young.get('/auth/me')).status).toBe(401);
  expect((await agent.get('/users?page=0')).status).toBe(400);
  expect((await agent.get(`/users/${randomUUID()}`)).status).toBe(404);
  expect(
    (await agent.delete(`/users/${id}`).set('X-Requested-With', 'Conecta'))
      .status,
  ).toBe(204);
  expect(
    await getDatabaseClient().user.findUnique({ where: { id } }),
  ).toBeNull();
});
it('rejects cross-origin writes and malformed requests, and preserves health checks', async () => {
  const data = { email: 'unknown@example.com', password: 'abcdef' };
  expect((await request(app).post('/auth/login').send(data)).status).toBe(403);
  expect(
    (
      await request(app)
        .post('/auth/login')
        .set('X-Requested-With', 'Conecta')
        .set('Origin', 'https://other.example')
        .send(data)
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/auth/login')
        .set('X-Requested-With', 'Conecta')
        .send(data)
    ).status,
  ).toBe(401);
  expect(
    (
      await request(app)
        .post('/users')
        .set('Content-Type', 'application/json')
        .send('{')
    ).status,
  ).toBe(400);
  expect((await request(app).get('/health/database')).status).toBe(200);
  expect((await request(app).get('/missing')).status).toBe(404);
});
it('upgrades a legacy Scrypt account at login and rejects expired sessions', async () => {
  const salt = 'a'.repeat(32);
  const legacy = `scrypt:${salt}:${scryptSync('abcdef', salt, 64).toString('hex')}`;
  const stored = await getDatabaseClient().user.create({
    data: { email: 'old@example.com', role: 'YOUTH', passwordHash: legacy },
  });
  const agent = request.agent(app);
  expect(
    (
      await agent
        .post('/auth/login')
        .set('X-Requested-With', 'Conecta')
        .send({ email: stored.email, password: 'abcdef' })
    ).status,
  ).toBe(200);
  expect(
    (
      await getDatabaseClient().user.findUniqueOrThrow({
        where: { id: stored.id },
      })
    ).passwordHash,
  ).toMatch(/^\$2b\$/);
  await getDatabaseClient().session.updateMany({
    where: { userId: stored.id },
    data: { expiresAt: new Date(0) },
  });
  expect((await agent.get('/auth/me')).status).toBe(401);
});

it('rotates login sessions and blocks forged logout without invalidating the valid session', async () => {
  await request(app).post('/users').send(userInput);
  const agent = request.agent(app);
  const first = await agent
    .post('/auth/login')
    .set('X-Requested-With', 'Conecta')
    .send({ email: userInput.email, password: userInput.password });
  const oldCookie = first.headers['set-cookie']![0]!;
  expect((await agent.post('/auth/logout')).status).toBe(403);
  expect((await agent.get('/auth/me')).status).toBe(200);
  expect((await agent.get('/companies/me')).status).toBe(403);
  const second = await agent
    .post('/auth/login')
    .set('X-Requested-With', 'Conecta')
    .send({ email: userInput.email, password: userInput.password });
  expect(second.status).toBe(200);
  expect(second.headers['set-cookie']).not.toEqual(first.headers['set-cookie']);
  expect(
    (await request(app).get('/auth/me').set('Cookie', oldCookie)).status,
  ).toBe(401);
  expect((await agent.get('/auth/me')).status).toBe(200);
});
it('rejects duplicate CPF/email and handles concurrent youth creation atomically', async () => {
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
  expect(await getDatabaseClient().user.count()).toBe(1);
  const email = responses.find((response) => response.status === 201)!.body.user
    .email;
  expect(
    (
      await request(app)
        .post('/users')
        .send({ ...userInput, email: email.toUpperCase() })
    ).status,
  ).toBe(409);
});
it('requires HTTPS and sets Secure cookies behind the configured trusted proxy in production', async () => {
  const previous = { nodeEnv: env.nodeEnv, trustProxyHops: env.trustProxyHops };
  await request(app).post('/users').send(userInput);
  env.nodeEnv = 'production';
  env.trustProxyHops = 1;
  try {
    const production = (await import('../../../app.js')).createApp();
    expect((await request(production).get('/health')).status).toBe(426);
    const response = await request(production)
      .post('/auth/login')
      .set('Host', 'app.example')
      .set('Origin', 'https://app.example')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Requested-With', 'Conecta')
      .send({ email: userInput.email, password: userInput.password });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']![0]).toContain('Secure');
    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000',
    );
  } finally {
    Object.assign(env, previous);
  }
});
it('creates an administrator only through the setup command and refuses to overwrite an existing account', async () => {
  const cwd = fileURLToPath(new URL('../../../../../../', import.meta.url));
  const options = {
    cwd,
    env: {
      ...process.env,
      ADMIN_EMAIL: 'setup@example.com',
      ADMIN_PASSWORD: 'abcdef',
    },
    stdio: 'pipe' as const,
  };
  execFileSync('pnpm', ['--filter', '@conecta/api', 'admin:create'], options);
  const stored = await getDatabaseClient().user.findUniqueOrThrow({
    where: { email: 'setup@example.com' },
  });
  expect(stored.role).toBe('ADMIN');
  expect(stored.passwordHash).toMatch(/^\$2b\$/);
  expect(() =>
    execFileSync('pnpm', ['--filter', '@conecta/api', 'admin:create'], options),
  ).toThrow();
  expect(
    await getDatabaseClient().user.count({ where: { email: stored.email } }),
  ).toBe(1);
});
