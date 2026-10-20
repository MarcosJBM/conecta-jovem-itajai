import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    exclude: ['src/http/controllers/**/schemas.spec.ts'],
    environment: 'node',
    include: ['src/http/controllers/**/*.spec.ts', 'tests/e2e/*.test.ts'],
    setupFiles: ['src/utils/test/setup-e2e.ts'],
    fileParallelism: false,
    hookTimeout: 60000,
  },
});
