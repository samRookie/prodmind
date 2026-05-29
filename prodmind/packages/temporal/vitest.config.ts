import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    timeout: 60_000,
    hookTimeout: 30_000,
  },
});
