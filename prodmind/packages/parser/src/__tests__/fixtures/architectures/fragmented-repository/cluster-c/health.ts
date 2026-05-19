import { recordMetric } from './metrics';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export function checkHealth(): HealthStatus {
  recordMetric('health_check', 1);
  return 'healthy';
}
