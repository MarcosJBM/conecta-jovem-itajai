import { expect, it } from 'vitest';
import { environmentSchema } from './env.js';

it('validates port bounds, node environment and PostgreSQL URL', () => {
  const input = { DATABASE_URL: 'postgresql://localhost/test' };

  expect(environmentSchema.parse(input)).toMatchObject({
    API_PORT: 3333,
    NODE_ENV: 'development',
  });

  for (const API_PORT of ['', '0', '-1', '1.5', '65536', 'abc'])
    expect(environmentSchema.safeParse({ ...input, API_PORT }).success).toBe(
      false,
    );

  expect(
    environmentSchema.safeParse({ ...input, NODE_ENV: 'wrong' }).success,
  ).toBe(false);

  expect(
    environmentSchema.safeParse({ DATABASE_URL: 'https://example.com' })
      .success,
  ).toBe(false);
});
