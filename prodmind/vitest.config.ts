import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    timeout: 30_000,
    hookTimeout: 30_000,
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx', 'src/**/__tests__/**/*.test.ts'],
  },
});
