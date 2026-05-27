import { describe, it, expect } from 'vitest';
import { CircuitBreaker, ProviderCircuitBreakerPool, DEFAULT_CIRCUIT_BREAKER_OPTIONS } from '../resilience/circuit-breaker.ts';
import type { CircuitBreakerOptions } from '../resilience/circuit-breaker.ts';
import type { DeterministicClock } from '../determinism/clock.ts';

class TestClock implements DeterministicClock {
  private _now = 0;
  public now(): number {
    return this._now;
  }
  public advance(ms: number): void {
    this._now += ms;
  }
}

function createBreakerWithClock(
  opts?: Partial<CircuitBreakerOptions>,
): { cb: CircuitBreaker; clock: TestClock } {
  const clock = new TestClock();
  const cb = new CircuitBreaker(opts, clock);
  return { cb, clock };
}

describe('CircuitBreaker', () => {
  describe('initial state', () => {
    it('is CLOSED by default', () => {
      const cb = new CircuitBreaker();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isClosed()).toBe(true);
      expect(cb.isOpen()).toBe(false);
      expect(cb.isHalfOpen()).toBe(false);
    });

    it('has zero failure count', () => {
      const cb = new CircuitBreaker();
      expect(cb.getFailureCount()).toBe(0);
    });

    it('returns empty metrics', () => {
      const cb = new CircuitBreaker();
      const m = cb.getMetrics();
      expect(m.state).toBe('CLOSED');
      expect(m.failureCount).toBe(0);
      expect(m.successCount).toBe(0);
      expect(m.totalCalls).toBe(0);
      expect(m.openCount).toBe(0);
      expect(m.halfOpenCount).toBe(0);
    });
  });

  describe('frozen returns', () => {
    it('DEFAULT_CIRCUIT_BREAKER_OPTIONS is frozen', () => {
      expect(Object.isFrozen(DEFAULT_CIRCUIT_BREAKER_OPTIONS)).toBe(true);
    });

    it('getMetrics returns frozen object', () => {
      const cb = new CircuitBreaker();
      const m = cb.getMetrics();
      expect(Object.isFrozen(m)).toBe(true);
    });

    it('getAllStates returns frozen record', () => {
      const pool = new ProviderCircuitBreakerPool();
      pool.getOrCreate('a');
      const states = pool.getAllStates();
      expect(Object.isFrozen(states)).toBe(true);
    });
  });

  describe('state transitions: CLOSED -> OPEN', () => {
    it('opens after failureThreshold failures', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 3 });

      cb.recordFailure(); // 1
      expect(cb.getState()).toBe('CLOSED');
      clock.advance(1);
      cb.recordFailure(); // 2
      expect(cb.getState()).toBe('CLOSED');
      clock.advance(1);
      cb.recordFailure(); // 3
      expect(cb.getState()).toBe('OPEN');
      expect(cb.isOpen()).toBe(true);
    });

    it('does not open below threshold', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: 5 });
      for (let i = 0; i < 4; i++) {
        cb.recordFailure();
      }
      expect(cb.getState()).toBe('CLOSED');
    });

    it('opens on single failure when threshold is 1', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: 1 });
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('opens on single failure when threshold is 0', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: 0 });
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('state transitions: OPEN -> HALF_OPEN', () => {
    it('transitions to HALF_OPEN after cooldown elapses', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 1, cooldownMs: 100 });

      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.isOpen()).toBe(true);

      clock.advance(50);
      expect(cb.isOpen()).toBe(true);
      expect(cb.getState()).toBe('OPEN');

      clock.advance(60);
      expect(cb.isOpen()).toBe(false);
      expect(cb.getState()).toBe('HALF_OPEN');
      expect(cb.isHalfOpen()).toBe(true);
    });

    it('transitions on exact cooldown boundary', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 1, cooldownMs: 100 });

      cb.recordFailure();
      clock.advance(100);
      expect(cb.isOpen()).toBe(false);
      expect(cb.getState()).toBe('HALF_OPEN');
    });
  });

  describe('state transitions: HALF_OPEN -> CLOSED', () => {
    it('closes after successThresholdInHalfOpen successes', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 1,
        successThresholdInHalfOpen: 2,
        cooldownMs: 100,
      });

      cb.recordFailure();
      clock.advance(100);
      cb.isOpen(); // triggers HALF_OPEN
      expect(cb.getState()).toBe('HALF_OPEN');

      cb.recordSuccess();
      expect(cb.getState()).toBe('HALF_OPEN');

      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isClosed()).toBe(true);
    });

    it('closes on single success when threshold is 1', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 1,
        successThresholdInHalfOpen: 1,
        cooldownMs: 100,
      });

      cb.recordFailure();
      clock.advance(100);
      cb.isOpen();

      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('state transitions: HALF_OPEN -> OPEN', () => {
    it('re-opens on failure in half-open state', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 3,
        successThresholdInHalfOpen: 2,
        cooldownMs: 100,
      });

      // Trip the breaker
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      clock.advance(100);
      cb.isOpen(); // -> HALF_OPEN

      // Failure in half-open
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('isOpen behavior', () => {
    it('rejects all requests when OPEN', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 2, cooldownMs: 500 });

      cb.recordFailure();
      cb.recordFailure();
      expect(cb.isOpen()).toBe(true);

      clock.advance(200);
      expect(cb.isOpen()).toBe(true); // still in cooldown
    });

    it('rejects when HALF_OPEN and at max test requests', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 1,
        halfOpenMaxRequests: 2,
        cooldownMs: 100,
      });

      cb.recordFailure();
      clock.advance(100);
      cb.isOpen(); // -> HALF_OPEN

      expect(cb.isOpen()).toBe(false); // 0 of 2 used

      cb.recordSuccess(); // uses 1
      expect(cb.isOpen()).toBe(false); // 1 of 2 used

      cb.recordSuccess(); // uses 2, triggers CLOSED since successThresholdInHalfOpen=2
      expect(cb.isOpen()).toBe(false);
      expect(cb.getState()).toBe('CLOSED');
    });

    it('rejects in HALF_OPEN when max test requests exceeded', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 1,
        halfOpenMaxRequests: 1,
        successThresholdInHalfOpen: 2, // > halfOpenMaxRequests, so never closes via success
        cooldownMs: 100,
      });

      cb.recordFailure();
      clock.advance(100);
      cb.isOpen(); // -> HALF_OPEN

      expect(cb.isOpen()).toBe(false); // first request allowed

      // Record a success but not enough to close
      cb.recordSuccess(); // 1 success, need 2, so still HALF_OPEN

      // Now at max requests
      expect(cb.isOpen()).toBe(true); // blocked
    });
  });

  describe('rolling window', () => {
    it('evicts failures outside the window', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 5,
        rollingWindowMs: 100,
      });

      cb.recordFailure(); // t=0
      clock.advance(30);
      cb.recordFailure(); // t=30
      clock.advance(30);
      cb.recordFailure(); // t=60

      expect(cb.getFailureCount()).toBe(3);

      clock.advance(50); // t=110, first failure (t=0) is now outside 100ms window
      expect(cb.getFailureCount()).toBe(2);
    });

    it('evicts multiple failures outside the window', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 5,
        rollingWindowMs: 100,
      });

      cb.recordFailure(); // t=0
      clock.advance(30);
      cb.recordFailure(); // t=30
      clock.advance(70); // t=100, first failure is exactly at boundary
      expect(cb.getFailureCount()).toBe(2); // both t=0 and t=30 are within [0,100]

      clock.advance(1); // t=101, t=0 is now outside window
      expect(cb.getFailureCount()).toBe(1); // only t=30 remains

      clock.advance(30); // t=131, t=30 is now outside window
      expect(cb.getFailureCount()).toBe(0);
    });

    it('does not open if old failures expired', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 3,
        rollingWindowMs: 100,
        cooldownMs: 200,
      });

      cb.recordFailure(); // t=0
      clock.advance(40);
      cb.recordFailure(); // t=40
      clock.advance(40);
      cb.recordFailure(); // t=80, 3 failures, opens
      expect(cb.getState()).toBe('OPEN');

      clock.advance(200); // cooldown expires
      cb.isOpen(); // -> HALF_OPEN
      cb.recordSuccess(); // close
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');

      // Now the old failures are at t=0,40,80 which are all > 280ms ago
      // Rolling window is 100ms, so they should be gone
      clock.advance(10);
      expect(cb.getFailureCount()).toBe(0);

      // New failures should be tracked independently
      cb.recordFailure(); // 1
      expect(cb.getState()).toBe('CLOSED');
      clock.advance(1);
      cb.recordFailure(); // 2
      expect(cb.getState()).toBe('CLOSED');
      clock.advance(1);
      cb.recordFailure(); // 3
      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('getFailureCount', () => {
    it('returns correct count after successes do not affect it', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 5, rollingWindowMs: 100 });

      cb.recordFailure(); // t=0
      clock.advance(10);
      cb.recordFailure(); // t=10
      expect(cb.getFailureCount()).toBe(2);

      cb.recordSuccess();
      expect(cb.getFailureCount()).toBe(2); // successes don't affect failure count
    });

    it('returns count in rolling window only', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 10, rollingWindowMs: 50 });

      cb.recordFailure();
      clock.advance(60);
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('restores CLOSED state', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: 1 });
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      cb.reset();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.isClosed()).toBe(true);
    });

    it('clears failure count', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 3 });
      cb.recordFailure();
      cb.recordFailure();
      clock.advance(1);
      cb.recordFailure();
      expect(cb.getFailureCount()).toBe(3);

      cb.reset();
      expect(cb.getFailureCount()).toBe(0);
    });

    it('clears all metrics', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 1, cooldownMs: 10 });
      cb.recordFailure();
      clock.advance(10);
      cb.isOpen(); // HALF_OPEN
      cb.recordSuccess();

      const before = cb.getMetrics();
      expect(before.totalCalls).toBeGreaterThan(0);

      cb.reset();
      const after = cb.getMetrics();
      expect(after.totalCalls).toBe(0);
      expect(after.successCount).toBe(0);
      expect(after.openCount).toBe(0);
      expect(after.halfOpenCount).toBe(0);
      expect(after.failureCount).toBe(0);
    });
  });

  describe('metrics', () => {
    it('tracks totalCalls', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });
      cb.recordSuccess();
      cb.recordSuccess();
      cb.recordFailure();
      expect(cb.getMetrics().totalCalls).toBe(3);
      expect(cb.getMetrics().successCount).toBe(2);
    });

    it('tracks openCount', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 2, cooldownMs: 10 });

      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getMetrics().openCount).toBe(1);

      clock.advance(10);
      cb.isOpen(); // HALF_OPEN
      cb.recordFailure(); // back to OPEN
      expect(cb.getMetrics().openCount).toBe(2);
    });

    it('tracks halfOpenCount', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 1, cooldownMs: 10 });

      cb.recordFailure();
      clock.advance(10);
      cb.isOpen(); // HALF_OPEN -> halfOpenCount = 1
      expect(cb.getMetrics().halfOpenCount).toBe(1);

      cb.recordFailure(); // back to OPEN
      clock.advance(10);
      cb.isOpen(); // HALF_OPEN again -> halfOpenCount = 2
      expect(cb.getMetrics().halfOpenCount).toBe(2);
    });
  });

  describe('clock injection', () => {
    it('uses injected DeterministicClock', () => {
      const clock = new TestClock();
      const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 100 }, clock);

      expect(clock.now()).toBe(0);

      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      clock.advance(100);
      expect(cb.isOpen()).toBe(false); // cooldown elapsed
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('works without clock injection (uses performance.now)', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5 });
      expect(cb.isClosed()).toBe(true);
      cb.recordSuccess();
      expect(cb.getMetrics().successCount).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles zero failureThreshold', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: 0 });
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('handles zero cooldownMs', () => {
      const { cb } = createBreakerWithClock({
        failureThreshold: 1,
        cooldownMs: 0,
      });

      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      // isOpen should immediately transition to HALF_OPEN
      expect(cb.isOpen()).toBe(false);
      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('handles negative thresholds by treating as zero', () => {
      const { cb } = createBreakerWithClock({ failureThreshold: -1 });
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('handles many repeated failures without memory leak (ring buffer bound)', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 10,
        rollingWindowMs: 1000,
        cooldownMs: 100,
      });

      // Pump many failures - ring buffer stays at capacity
      for (let i = 0; i < 100; i++) {
        clock.advance(5);
        cb.recordFailure();
      }

      // Should have exactly capacity entries (bounded)
      expect(cb.getState()).toBe('OPEN');

      clock.advance(100);
      cb.isOpen(); // HALF_OPEN
      cb.recordSuccess();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');

      // Buffer should only have at most 10 entries
      expect(cb.getFailureCount()).toBeLessThanOrEqual(10);
    });

    it('handles interleaved success and failure in CLOSED state', () => {
      const { cb, clock } = createBreakerWithClock({ failureThreshold: 3, rollingWindowMs: 100 });

      cb.recordFailure();
      clock.advance(1);
      cb.recordSuccess(); // success doesn't reset failure count in rolling window
      clock.advance(1);
      cb.recordFailure();
      clock.advance(1);
      cb.recordFailure();

      // Still only 3 failures in window
      expect(cb.getState()).toBe('OPEN');
    });

    it('does not count failures in half-open toward rolling window', () => {
      const { cb, clock } = createBreakerWithClock({
        failureThreshold: 3,
        rollingWindowMs: 1000,
        cooldownMs: 100,
      });

      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      clock.advance(100);
      cb.isOpen(); // HALF_OPEN

      // Failure in HALF_OPEN goes back to OPEN, not to buffer
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      // failureCount should be 3 (from CLOSED failures), not 4
      expect(cb.getFailureCount()).toBe(3);
    });
  });
});

describe('ProviderCircuitBreakerPool', () => {
  it('creates breakers per provider', () => {
    const pool = new ProviderCircuitBreakerPool();
    const a = pool.getOrCreate('provider-a');
    const b = pool.getOrCreate('provider-b');
    expect(a).not.toBe(b);
  });

  it('returns same breaker for same provider', () => {
    const pool = new ProviderCircuitBreakerPool();
    const a1 = pool.getOrCreate('test-provider');
    const a2 = pool.getOrCreate('test-provider');
    expect(a1).toBe(a2);
  });

  it('getAllStates returns sorted states', () => {
    const pool = new ProviderCircuitBreakerPool();
    pool.getOrCreate('zeta');
    pool.getOrCreate('alpha');
    pool.getOrCreate('beta');

    const states = pool.getAllStates();
    expect(Object.keys(states)).toEqual(['alpha', 'beta', 'zeta']);
  });

  it('resetAll resets all breakers', () => {
    const pool = new ProviderCircuitBreakerPool(
      { failureThreshold: 1, cooldownMs: 100 },
      new TestClock(),
    );

    const a = pool.getOrCreate('provider-a');
    const b = pool.getOrCreate('provider-b');

    a.recordFailure();
    b.recordFailure();

    expect(a.getState()).toBe('OPEN');
    expect(b.getState()).toBe('OPEN');

    pool.resetAll();
    expect(a.getState()).toBe('CLOSED');
    expect(b.getState()).toBe('CLOSED');
  });

  it('passes default options to created breakers', () => {
    const pool = new ProviderCircuitBreakerPool(
      { failureThreshold: 1, cooldownMs: 5000 },
    );

    const cb = pool.getOrCreate('test');
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
  });

  it('uses localeCompare for deterministic ordering', () => {
    const pool = new ProviderCircuitBreakerPool();
    pool.getOrCreate('b');
    pool.getOrCreate('a');
    pool.getOrCreate('c');

    const states = pool.getAllStates();
    expect(Object.keys(states)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty pool', () => {
    const pool = new ProviderCircuitBreakerPool();
    expect(pool.getAllStates()).toEqual({});
  });
});

describe('DEFAULT_CIRCUIT_BREAKER_OPTIONS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.failureThreshold).toBe(5);
    expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.successThresholdInHalfOpen).toBe(2);
    expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.cooldownMs).toBe(30_000);
    expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.rollingWindowMs).toBe(60_000);
    expect(DEFAULT_CIRCUIT_BREAKER_OPTIONS.halfOpenMaxRequests).toBe(3);
  });
});
