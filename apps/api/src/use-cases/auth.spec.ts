import { beforeEach, expect, it } from 'vitest';
import { InMemoryUsersRepository } from '../repositories/in-memory/in-memory-users-repository.js';
import { InMemorySessionsRepository } from '../repositories/in-memory/in-memory-sessions-repository.js';
import { CreateUserUseCase } from './create-user.js';
import { SessionUseCase, tokenHash, sessionDuration } from './session.js';
import { LoginUseCase } from './login.js';
import { userInput, fakeHasher } from '../utils/test/user-fixture.js';
import { UnauthorizedError } from './errors/unauthorized-error.js';
let users: InMemoryUsersRepository;
let sessions: InMemorySessionsRepository;
let now: Date;
let useCase: SessionUseCase;
beforeEach(() => {
  users = new InMemoryUsersRepository();
  sessions = new InMemorySessionsRepository();
  now = new Date('2026-10-16T12:00:00Z');
  useCase = new SessionUseCase(sessions, users, () => now);
});
it('persists only a token hash, expires at 24h, revokes logout and uses fresh user data', async () => {
  const { user } = await new CreateUserUseCase(users, fakeHasher).execute(
    userInput,
  );
  const token = await useCase.create(user.id);
  expect(sessions.items.has(token)).toBe(false);
  expect(sessions.items.get(tokenHash(token))?.expiresAt.getTime()).toBe(
    now.getTime() + sessionDuration,
  );
  expect(await useCase.authenticate(token)).toEqual({
    id: user.id,
    email: user.email,
    role: 'YOUTH',
  });
  await users.update(user.id, { email: 'new@example.com' });
  expect((await useCase.authenticate(token)).email).toBe('new@example.com');
  await useCase.logout(token);
  await expect(useCase.authenticate(token)).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
  const other = await useCase.create(user.id);
  now = new Date(now.getTime() + sessionDuration);
  await expect(useCase.authenticate(other)).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
  expect(sessions.items.size).toBe(0);
  await expect(useCase.authenticate('bad')).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
  await expect(useCase.authenticate(undefined)).rejects.toBeInstanceOf(
    UnauthorizedError,
  );
});
it('returns identical errors for unknown users and wrong passwords and never creates sessions on failure', async () => {
  await new CreateUserUseCase(users, fakeHasher).execute(userInput);
  const login = new LoginUseCase(users, useCase, {
    ...fakeHasher,
    verify: async (value, stored) => stored === `hashed:${value}`,
  });
  for (const [email, password] of [
    [userInput.email, 'wrong'],
    ['unknown@example.com', userInput.password],
  ]) {
    await expect(login.execute(email!, password!)).rejects.toThrow(
      'E-mail ou senha inválidos.',
    );
  }
  expect(sessions.items.size).toBe(0);
  const result = await login.execute(' YOUNG@EXAMPLE.COM ', userInput.password);
  expect(result.user).not.toHaveProperty('passwordHash');
  expect((await useCase.authenticate(result.token)).id).toBe(result.user.id);
});
