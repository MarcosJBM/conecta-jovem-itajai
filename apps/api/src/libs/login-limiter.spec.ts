import { expect, it } from 'vitest';
import { LoginLimiter } from './login-limiter.js';
it('limits failed login attempts and releases them after the cooldown or a success', () => {
  let now = 0;
  const limiter = new LoginLimiter(() => now);
  for (let i = 0; i < 10; i++) limiter.failure('ip');
  expect(limiter.blocked('ip')).toBe(true);
  expect(limiter.blocked('other')).toBe(false);
  now += 15 * 60 * 1000;
  expect(limiter.blocked('ip')).toBe(false);
  limiter.failure('ip');
  limiter.clear('ip');
  expect(limiter.blocked('ip')).toBe(false);
});
