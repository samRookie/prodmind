import { getEnv } from '@prodmind/core';

export const serverConfig = {
  port: getEnv().PORT,
  host: getEnv().HOST,
  apiPrefix: '/api/v1',
  corsOrigins: getEnv().CORS_ORIGINS?.split(',').map((s) => s.trim()) ?? ['http://localhost:5173'],
} as const;
