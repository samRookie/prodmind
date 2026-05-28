import type { HealthCheckResult, HealthComponent } from './health-registry.ts';

export function createDatabaseHealthCheck(dbCheck: () => Promise<boolean>): () => Promise<HealthCheckResult> {
  return async () => {
    const start = Date.now();
    try {
      const ok = await dbCheck();
      return {
        component: 'database' as HealthComponent,
        status: ok ? 'healthy' : 'degraded',
        message: ok ? 'Database responsive' : 'Database slow or unresponsive',
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        component: 'database' as HealthComponent,
        status: 'unhealthy',
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  };
}

export function createPingHealthCheck(): () => Promise<HealthCheckResult> {
  return async () => ({
    component: 'runtime' as HealthComponent,
    status: 'healthy',
    message: 'Runtime responsive',
    latencyMs: 0,
    timestamp: new Date().toISOString(),
  });
}

export function createComponentHealthCheck(name: HealthComponent, checkFn: () => Promise<boolean>): () => Promise<HealthCheckResult> {
  return async () => {
    const start = Date.now();
    try {
      const ok = await checkFn();
      return {
        component: name,
        status: ok ? 'healthy' : 'degraded',
        message: ok ? `${name} responsive` : `${name} degraded`,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        component: name,
        status: 'unhealthy',
        message: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  };
}
