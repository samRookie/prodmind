export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type HealthComponent = 'database' | 'ai-provider' | 'graph-engine' | 'replay-engine' | 'queue' | 'cache' | 'storage' | 'runtime';

export interface HealthCheckResult {
  component: HealthComponent;
  status: HealthStatus;
  message: string;
  latencyMs: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheckResult[];
  degraded: HealthCheckResult[];
  unhealthy: HealthCheckResult[];
  timestamp: string;
}

export type HealthChecker = () => Promise<HealthCheckResult>;

export class HealthRegistry {
  private checkers = new Map<HealthComponent, HealthChecker>();

  register(component: HealthComponent, checker: HealthChecker): void {
    this.checkers.set(component, checker);
  }

  async check(): Promise<HealthReport> {
    const results: HealthCheckResult[] = [];
    for (const [component, checker] of this.checkers) {
      try {
        const result = await checker();
        results.push(result);
      } catch (err) {
        results.push({
          component,
          status: 'unhealthy',
          message: err instanceof Error ? err.message : String(err),
          latencyMs: 0,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const degraded = results.filter(r => r.status === 'degraded');
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    const status: HealthStatus = unhealthy.length > 0 ? 'unhealthy' : degraded.length > 0 ? 'degraded' : 'healthy';

    return { status, checks: results, degraded, unhealthy, timestamp: new Date().toISOString() };
  }
}
