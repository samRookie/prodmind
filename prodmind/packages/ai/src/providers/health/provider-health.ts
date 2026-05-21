import type { ProviderHealth, ProviderHealthStatus } from '../contracts.ts';
import { createProviderHealth } from '../contracts.ts';

export interface HealthConfig {
  readonly enabled: boolean;
  readonly failureThreshold: number;
  readonly recoveryThreshold: number;
  readonly checkIntervalMs: number;
}

const DEFAULT_CONFIG: HealthConfig = Object.freeze({
  enabled: true,
  failureThreshold: 5,
  recoveryThreshold: 3,
  checkIntervalMs: 60000,
});

export class ProviderHealthRegistry {
  private readonly states: Map<string, ProviderHealth> = new Map();
  private readonly config: HealthConfig;

  constructor(config?: Partial<HealthConfig>) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...config });
  }

  getHealth(provider: string): ProviderHealth {
    const existing = this.states.get(provider);
    if (existing) return existing;
    const health = createProviderHealth({ provider });
    this.states.set(provider, health);
    return health;
  }

  recordSuccess(provider: string, latencyMs: number): ProviderHealth {
    const current = this.getHealth(provider);
    const newSuccessCount = current.successCount + 1;
    const newFailureCount = 0;
    const newAvgLatency = this.computeMovingAverage(current.avgLatencyMs, latencyMs, current.successCount);
    const status = newSuccessCount >= this.config.recoveryThreshold ? 'healthy' : current.status;

    const health = createProviderHealth({
      provider,
      status,
      lastCheckMs: Date.now(),
      failureCount: newFailureCount,
      successCount: newSuccessCount,
      avgLatencyMs: newAvgLatency,
    });
    this.states.set(provider, health);
    return health;
  }

  recordFailure(provider: string, error?: string): ProviderHealth {
    const current = this.getHealth(provider);
    const newFailureCount = current.failureCount + 1;
    const status: ProviderHealthStatus = newFailureCount >= this.config.failureThreshold ? 'unavailable' : 'degraded';

    const health = createProviderHealth({
      provider,
      status,
      lastCheckMs: Date.now(),
      failureCount: newFailureCount,
      successCount: current.successCount,
      avgLatencyMs: current.avgLatencyMs,
      lastError: error,
    });
    this.states.set(provider, health);
    return health;
  }

  markDegraded(provider: string, error?: string): ProviderHealth {
    return this.updateStatus(provider, 'degraded', error);
  }

  markUnavailable(provider: string, error?: string): ProviderHealth {
    return this.updateStatus(provider, 'unavailable', error);
  }

  markHealthy(provider: string): ProviderHealth {
    return this.updateStatus(provider, 'healthy');
  }

  isAvailable(provider: string): boolean {
    return this.getHealth(provider).status !== 'unavailable';
  }

  getAllHealth(): readonly ProviderHealth[] {
    return Object.freeze(Array.from(this.states.values()).map(h => Object.freeze({ ...h })));
  }

  reset(provider: string): void {
    this.states.delete(provider);
  }

  private updateStatus(provider: string, status: ProviderHealthStatus, error?: string): ProviderHealth {
    const current = this.getHealth(provider);
    const health = createProviderHealth({
      provider,
      status,
      lastCheckMs: Date.now(),
      failureCount: current.failureCount,
      successCount: current.successCount,
      avgLatencyMs: current.avgLatencyMs,
      lastError: error,
    });
    this.states.set(provider, health);
    return health;
  }

  private computeMovingAverage(currentAvg: number, newValue: number, count: number): number {
    if (count === 0) return newValue;
    return Math.round((currentAvg * count + newValue) / (count + 1) * 100) / 100;
  }
}
