import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    environment: 'node',
    env: { DATABASE_URL: 'postgresql://localhost/unit_test', NODE_ENV: 'test' },
    include: [
      'src/use-cases/**/*.spec.ts',
      'src/libs/**/*.spec.ts',
      'src/http/errors/**/*.spec.ts',
      'src/env.spec.ts',
      'src/http/controllers/**/schemas.spec.ts',
    ],
  },
});
