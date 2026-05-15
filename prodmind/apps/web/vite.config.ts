import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@prodmind/core': path.resolve(__dirname, '../../packages/core/src'),
      '@prodmind/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@prodmind/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@prodmind/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
