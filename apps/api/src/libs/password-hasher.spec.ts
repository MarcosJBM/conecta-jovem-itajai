import { scryptSync } from 'node:crypto';
import { expect, it } from 'vitest';
import { BcryptPasswordHasher } from './password-hasher.js';
it('hashes with BCrypt, verifies credentials, and reads legacy Scrypt safely', async () => {
  const hasher = new BcryptPasswordHasher();
  const first = await hasher.hash('abcdef');
  const second = await hasher.hash('abcdef');
  expect(first).toMatch(/^\$2b\$12\$/);
  expect(first).not.toBe(second);
  expect(await hasher.verify('abcdef', first)).toBe(true);
  expect(await hasher.verify('wrong', first)).toBe(false);
  const salt = 'a'.repeat(32);
  const legacy = `scrypt:${salt}:${scryptSync('abcdef', salt, 64).toString('hex')}`;
  expect(await hasher.verify('abcdef', legacy)).toBe(true);
  expect(await hasher.verify('wrong', legacy)).toBe(false);
  expect(await hasher.verify('abcdef', 'broken')).toBe(false);
  expect(await hasher.verify('á'.repeat(37), first)).toBe(false);
});
