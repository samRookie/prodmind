export const serverConfig = {
  port: Number(process.env['PORT']) || 3001,
  host: process.env['HOST'] || '0.0.0.0',
  apiPrefix: '/api/v1',
  corsOrigins: process.env['CORS_ORIGINS']?.split(',') ?? ['http://localhost:5173'],
} as const;
