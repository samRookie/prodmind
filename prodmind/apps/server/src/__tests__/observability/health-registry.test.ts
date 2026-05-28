import { describe, it, expect } from 'vitest';
import { HealthRegistry } from '../../observability/health/health-registry.ts';
import { createPingHealthCheck } from '../../observability/health/health-checks.ts';

describe('HealthRegistry', () => {
  it('returns healthy for all registered checks', async () => {
    const r = new HealthRegistry();
    r.register('runtime', createPingHealthCheck());
    const report = await r.check();
    expect(report.status).toBe('healthy');
  });

  it('returns unhealthy if check throws', async () => {
    const r = new HealthRegistry();
    r.register('database', async () => { throw new Error('DB down'); });
    const report = await r.check();
    expect(report.status).toBe('unhealthy');
  });

  it('aggregates multiple checks', async () => {
    const r = new HealthRegistry();
    r.register('runtime', createPingHealthCheck());
    r.register('database', async () => ({ component: 'database' as const, status: 'healthy' as const, message: 'ok', latencyMs: 0, timestamp: new Date().toISOString() }));
    const report = await r.check();
    expect(report.checks.length).toBe(2);
  });
});
