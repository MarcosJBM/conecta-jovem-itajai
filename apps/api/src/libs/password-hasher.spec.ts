import { scryptSync } from 'node:crypto';
import { expect, it } from 'vitest';
import { ScryptPasswordHasher } from './password-hasher.js';

it('uses unique salts and produces a verifiable scrypt hash', async () => {
  const hasher = new ScryptPasswordHasher();
  const first = await hasher.hash('password-123');
  const second = await hasher.hash('password-123');
  expect(first).not.toBe(second);
  const [, salt, key] = first.split(':');
  expect(scryptSync('password-123', salt!, 64).toString('hex')).toBe(key);
  expect(first.length).toBeLessThanOrEqual(255);
});
