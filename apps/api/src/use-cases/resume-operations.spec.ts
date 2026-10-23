import { expect, it } from 'vitest';
import { InMemoryResumesRepository } from '../repositories/in-memory/in-memory-resumes-repository.js';
import { normalizeYouth } from './validate-youth.js';
import { userInput } from '../utils/test/user-fixture.js';
import { GetResumeUseCase } from './get-resume.js';
import { UpdateResumeUseCase } from './update-resume.js';

it('saves, replaces and removes collections only for the session owner', async () => {
  const profile = {
    ...normalizeYouth(userInput.youthProfile, true),
    id: 'profile',
    userId: 'young',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = new InMemoryResumesRepository([
    profile,
    { ...profile, id: 'other-profile', userId: 'other' },
  ]);
  const get = new GetResumeUseCase(repository);
  const update = new UpdateResumeUseCase(repository);
  const user = {
    id: 'young',
    email: 'young@example.com',
    role: 'YOUTH' as const,
  };
  expect((await get.execute(user)).completeness.complete).toBe(false);
  const data = { skills: [' Comunicação '], educations: [], experiences: [] };
  const saved = await update.execute(user, data);
  expect(saved.completeness.complete).toBe(true);
  expect((await repository.findByUser(user.id))?.resume?.skills).toEqual([
    'Comunicação',
  ]);
  saved.resume.skills.push('Mutation');
  expect((await get.execute(user)).resume.skills).toEqual(['Comunicação']);
  await expect(
    update.execute(user, { ...data, skills: [' '] }),
  ).rejects.toThrow();
  expect((await get.execute(user)).resume.skills).toEqual(['Comunicação']);
  await update.execute(user, { ...data, skills: [] });
  expect((await get.execute(user)).completeness.complete).toBe(false);
  expect((await repository.findByUser('other'))?.resume).toBeNull();
  await expect(get.execute({ ...user, role: 'COMPANY' })).rejects.toThrow(
    'permitida',
  );
  await expect(
    update.execute({ ...user, role: 'ADMIN' }, data),
  ).rejects.toThrow('permitida');
  await expect(update.execute({ ...user, id: 'absent' }, data)).rejects.toThrow(
    'encontrado',
  );
});
