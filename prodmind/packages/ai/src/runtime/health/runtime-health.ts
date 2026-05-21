import type { RuntimeHealthSnapshot } from '../contracts/runtime-contracts.ts';

export interface HealthCheck {
  check(): RuntimeHealthSnapshot;
}

export interface HealthMonitor {
  getSnapshot(): RuntimeHealthSnapshot;
  getUptimeMs(): number;
  recordEvent(success: boolean): void;
}

export class RuntimeHealthMonitor implements HealthMonitor {
  private startTime = Date.now();
  private events: boolean[] = [];
  private lastError?: string;
  private readonly windowSize: number;

  constructor(windowSize = 100) {
    this.windowSize = windowSize;
  }

  check(): RuntimeHealthSnapshot {
    return this.getSnapshot();
  }

  getSnapshot(): RuntimeHealthSnapshot {
    const recentEvents = this.events.slice(-this.windowSize);
    const failures = recentEvents.filter(e => !e).length;
    const failureRate = recentEvents.length > 0 ? failures / recentEvents.length : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failureRate > 0.5) status = 'unhealthy';
    else if (failureRate > 0.2) status = 'degraded';

    return Object.freeze({
      status,
      queueDepth: 0,
      activeExecutions: this.events.length,
      retryStormDetected: this.detectRetryStorm(),
      budgetExhausted: false,
      failureRate,
      uptimeMs: this.getUptimeMs(),
      lastError: this.lastError,
    });
  }

  getUptimeMs(): number {
    return Date.now() - this.startTime;
  }

  recordEvent(success: boolean): void {
    this.events.push(success);
    if (!success) {
      this.lastError = `failure at ${new Date().toISOString()}`;
    }
    if (this.events.length > this.windowSize * 2) {
      this.events = this.events.slice(-this.windowSize);
    }
  }

  reset(): void {
    this.startTime = Date.now();
    this.events = [];
    this.lastError = undefined;
  }

  private detectRetryStorm(): boolean {
    const recent = this.events.slice(-10);
    if (recent.length < 5) return false;
    const failures = recent.filter(e => !e).length;
    return failures >= 5;
  }
}
