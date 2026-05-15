import { Hono } from 'hono';
import type { HealthStatus, ApiResponse } from '@prodmind/contracts';
import { VERSION } from '@prodmind/shared';

const healthRouter = new Hono();

healthRouter.get('/', (c) => {
  const status: HealthStatus = {
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: [
      { name: 'system', status: 'ok' },
      { name: 'database', status: 'degraded', message: 'Not connected' },
    ],
  };

  const response: ApiResponse<HealthStatus> = {
    success: true,
    data: status,
  };

  return c.json(response);
});

export { healthRouter };
