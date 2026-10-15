import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    environment: 'node',
    include: ['src/http/controllers/**/*.spec.ts'],
    setupFiles: ['src/utils/test/setup-e2e.ts'],
    fileParallelism: false,
    hookTimeout: 60000,
  },
});
