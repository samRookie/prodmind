import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    timeout: 60_000,
    hookTimeout: 30_000,
  },
});
