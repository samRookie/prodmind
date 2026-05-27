import type { DeterministicClock } from '../determinism/clock.ts';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThresholdInHalfOpen?: number;
  cooldownMs?: number;
  rollingWindowMs?: number;
  halfOpenMaxRequests?: number;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Required<CircuitBreakerOptions> = Object.freeze({
  failureThreshold: 5,
  successThresholdInHalfOpen: 2,
  cooldownMs: 30_000,
  rollingWindowMs: 60_000,
  halfOpenMaxRequests: 3,
});

export type CircuitBreakerConfig = CircuitBreakerOptions;

export interface CircuitBreakerMetrics {
  readonly state: CircuitBreakerState;
  readonly failureCount: number;
  readonly successCount: number;
  readonly totalCalls: number;
  readonly openCount: number;
  readonly halfOpenCount: number;
}

export class CircuitBreaker {
  private _state: CircuitBreakerState = 'CLOSED';
  private readonly _buffer: number[];
  private _writeIndex = 0;
  private _stored = 0;
  private _successCount = 0;
  private _halfOpenSuccesses = 0;
  private _halfOpenRequests = 0;
  private _totalCalls = 0;
  private _openCount = 0;
  private _halfOpenCount = 0;
  private _openedAt = 0;
  private readonly _capacity: number;
  private readonly _clock?: DeterministicClock;
  private readonly _options: Required<CircuitBreakerOptions>;

  public constructor(options?: CircuitBreakerOptions, clock?: DeterministicClock) {
    this._options = {
      ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
      ...options,
    };
    this._capacity = Math.max(1, this._options.failureThreshold);
    this._buffer = new Array(this._capacity);
    this._clock = clock;
  }

  private _now(): number {
    return this._clock?.now() ?? performance.now();
  }

  private _countInWindow(): number {
    const now = this._now();
    let count = 0;
    const limit = Math.min(this._stored, this._capacity);
    for (let i = 0; i < limit; i++) {
      const idx = (this._writeIndex - limit + i + this._capacity) % this._capacity;
      const ts = this._buffer[idx];
      if (ts !== undefined && now - ts <= this._options.rollingWindowMs) {
        count++;
      }
    }
    return count;
  }

  public isOpen(): boolean {
    if (this._state === 'OPEN') {
      if (this._now() - this._openedAt >= this._options.cooldownMs) {
        this._state = 'HALF_OPEN';
        this._halfOpenCount++;
        this._halfOpenSuccesses = 0;
        this._halfOpenRequests = 0;
        return false;
      }
      return true;
    }
    if (this._state === 'HALF_OPEN') {
      return this._halfOpenRequests >= this._options.halfOpenMaxRequests;
    }
    return false;
  }

  public isHalfOpen(): boolean {
    return this._state === 'HALF_OPEN';
  }

  public isClosed(): boolean {
    return this._state === 'CLOSED';
  }

  public getState(): CircuitBreakerState {
    return this._state;
  }

  public getFailureCount(): number {
    return this._countInWindow();
  }

  public recordSuccess(): void {
    this._totalCalls++;
    this._successCount++;

    if (this._state === 'HALF_OPEN') {
      this._halfOpenRequests++;
      this._halfOpenSuccesses++;
      if (this._halfOpenSuccesses >= this._options.successThresholdInHalfOpen) {
        this._state = 'CLOSED';
        this._halfOpenSuccesses = 0;
        this._halfOpenRequests = 0;
      }
    }
  }

  public recordFailure(): void {
    this._totalCalls++;
    const now = this._now();

    if (this._state === 'HALF_OPEN') {
      this._halfOpenRequests++;
      this._state = 'OPEN';
      this._openedAt = now;
      this._openCount++;
      return;
    }

    this._buffer[this._writeIndex] = now;
    this._writeIndex = (this._writeIndex + 1) % this._capacity;
    if (this._stored < this._capacity) {
      this._stored++;
    }

    if (this._state === 'CLOSED' && this._countInWindow() >= this._options.failureThreshold) {
      this._state = 'OPEN';
      this._openedAt = now;
      this._openCount++;
    }
  }

  public reset(): void {
    this._state = 'CLOSED';
    this._buffer.fill(undefined as unknown as number);
    this._writeIndex = 0;
    this._stored = 0;
    this._successCount = 0;
    this._halfOpenSuccesses = 0;
    this._halfOpenRequests = 0;
    this._totalCalls = 0;
    this._openCount = 0;
    this._halfOpenCount = 0;
    this._openedAt = 0;
  }

  public getMetrics(): CircuitBreakerMetrics {
    return Object.freeze({
      state: this._state,
      failureCount: this._countInWindow(),
      successCount: this._successCount,
      totalCalls: this._totalCalls,
      openCount: this._openCount,
      halfOpenCount: this._halfOpenCount,
    });
  }
}

export class ProviderCircuitBreakerPool {
  private readonly _breakers = new Map<string, CircuitBreaker>();
  private readonly _defaultOptions?: CircuitBreakerOptions;
  private readonly _clock?: DeterministicClock;

  public constructor(defaultOptions?: CircuitBreakerOptions, clock?: DeterministicClock) {
    this._defaultOptions = defaultOptions;
    this._clock = clock;
  }

  public getOrCreate(providerId: string): CircuitBreaker {
    let breaker = this._breakers.get(providerId);
    if (breaker === undefined) {
      breaker = new CircuitBreaker(this._defaultOptions, this._clock);
      this._breakers.set(providerId, breaker);
    }
    return breaker;
  }

  public getAllStates(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {};
    const sorted = Array.from(this._breakers.keys()).sort((a, b) => a.localeCompare(b));
    for (const key of sorted) {
      result[key] = this._breakers.get(key)!.getState();
    }
    return Object.freeze(result);
  }

  public resetAll(): void {
    for (const breaker of this._breakers.values()) {
      breaker.reset();
    }
  }
}
