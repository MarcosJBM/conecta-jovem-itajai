import { expect, test } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { account, session } from '../../src/utils/test/session-fixture.js';
import { getDatabaseClient } from '../../src/libs/prisma.js';

test('own resume is private, replacement is atomic and concurrent first saves keep one resume', async () => {
  const app = createApp();
  const youth = await account('YOUTH');
  const other = await account('YOUTH', 2);
  const agent = await session(app, youth);
  const data = {
    skills: ['Comunicação'],
    educations: [
      {
        institution: 'Escola',
        course: 'Informática',
        level: 'Técnico',
        startMonth: '2025-01',
        endMonth: null,
        inProgress: true,
      },
    ],
    experiences: [],
  };
  expect((await request(app).get('/resumes/me')).status).toBe(401);
  for (const role of ['ADMIN', 'COMPANY'] as const) {
    const forbidden = await session(app, await account(role));
    expect((await forbidden.get('/resumes/me')).status).toBe(403);
    expect(
      (
        await forbidden
          .put('/resumes/me')
          .set('X-Requested-With', 'Conecta')
          .send(data)
      ).status,
    ).toBe(403);
  }
  expect((await agent.get('/resumes/me')).body.updatedAt).toBeNull();
  const responses = await Promise.all(
    [1, 2].map(() =>
      agent.put('/resumes/me').set('X-Requested-With', 'Conecta').send(data),
    ),
  );
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const prisma = getDatabaseClient();
  expect(await prisma.resume.count()).toBe(1);
  const saved = (await agent.get('/resumes/me')).body;
  expect(saved.completeness.complete).toBe(true);
  expect(saved.resume.skills).toEqual(['Comunicação']);
  expect(saved.resume.personalDetails).not.toHaveProperty('cpf');
  expect(saved.resume.personalDetails).not.toHaveProperty('street');
  expect(
    (await (await session(app, other)).get('/resumes/me')).body.resume.skills,
  ).toEqual([]);
  for (const invalid of [
    { ...data, userId: other.id },
    { ...data, cpf: 'injected' },
    {
      ...data,
      educations: [
        { ...data.educations[0], endMonth: '2024-01', inProgress: false },
      ],
    },
  ]) {
    expect(
      (
        await agent
          .put('/resumes/me')
          .set('X-Requested-With', 'Conecta')
          .send(invalid)
      ).status,
    ).toBe(400);
  }
  expect((await agent.get('/resumes/me')).body.resume.educations).toHaveLength(
    1,
  );
  expect((await agent.put('/resumes/me').send(data)).status).toBe(403);
  expect(
    (
      await agent
        .put('/resumes/me')
        .set('X-Requested-With', 'Conecta')
        .send({ skills: [], educations: [], experiences: [] })
    ).body.completeness.complete,
  ).toBe(false);
  expect(await prisma.resumeEducation.count()).toBe(0);
  expect(await prisma.resumeSkill.count()).toBe(0);
});
