import type { RetryPolicy } from '../../retries/retry-policy.ts';
import type { RuntimeFailureRecord, RuntimePolicy, RuntimeRetryTrace } from '../contracts/runtime-contracts.ts';

export interface RetryGovernance {
  canRetry(attempt: number, failure: RuntimeFailureRecord, policy: RuntimePolicy): boolean;
  computeDelay(attempt: number): number;
  getTrace(): RuntimeRetryTrace;
}

export class RuntimeRetryGovernance implements RetryGovernance {
  private failureHistory: RuntimeFailureRecord[] = [];
  private totalDelayMs = 0;

  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(retryPolicy?: Partial<RetryPolicy>) {
    this.baseDelayMs = retryPolicy?.baseDelayMs ?? 1000;
    this.maxDelayMs = retryPolicy?.maxDelayMs ?? 30000;
  }

  canRetry(attempt: number, failure: RuntimeFailureRecord, policy: RuntimePolicy): boolean {
    this.failureHistory.push(failure);
    if (attempt >= policy.maxRetries) return false;
    if (!failure.recoverable) return false;
    return true;
  }

  computeDelay(attempt: number): number {
    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, attempt),
      this.maxDelayMs,
    );
    const backoffFactor = 0.1;
    const jitter = delay * backoffFactor * (attempt % 2 === 0 ? 1 : -1);
    const finalDelay = Math.max(0, Math.round(delay + jitter));
    this.totalDelayMs += finalDelay;
    return finalDelay;
  }

  getTrace(): RuntimeRetryTrace {
    return Object.freeze({
      attempts: this.failureHistory.length,
      maxAttempts: 3,
      totalDelayMs: this.totalDelayMs,
      backoffApplied: this.totalDelayMs > 0,
      failureHistory: Object.freeze([...this.failureHistory]),
    });
  }

  reset(): void {
    this.failureHistory = [];
    this.totalDelayMs = 0;
  }
}
