import { describe, expect, it, vi } from 'vitest';

import { ProviderRateLimitExceeded } from '../errors/provider-errors.ts';
import { ProviderRateLimiter } from '../ratelimit/provider-ratelimit.ts';

describe('ProviderRateLimiter', () => {
  it('allows first request', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    const state = rl.check('test');
    expect(state.isLimited).toBe(false);
    expect(state.tokensRemaining).toBe(100);
    expect(state.requestsRemaining).toBe(10);
  });

  it('consumes tokens on consume', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    rl.consume('test', 30);
    const state = rl.check('test');
    expect(state.tokensRemaining).toBe(70);
    expect(state.requestsRemaining).toBe(9);
  });

  it('throws when token limit exceeded', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 50, requestsPerMin: 100 });
    expect(() => rl.consume('test', 60)).toThrow(ProviderRateLimitExceeded);
  });

  it('throws when request limit exceeded', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 10000, requestsPerMin: 2 });
    rl.consume('test');
    rl.consume('test');
    expect(() => rl.consume('test')).toThrow(ProviderRateLimitExceeded);
  });

  it('returns isLimited when tokens exhausted', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 50, requestsPerMin: 1000 });
    rl.consume('test', 50);
    const state = rl.check('test');
    expect(state.isLimited).toBe(true);
    expect(state.tokensRemaining).toBe(0);
  });

  it('returns isLimited when requests exhausted', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100000, requestsPerMin: 1 });
    rl.consume('test');
    const state = rl.check('test');
    expect(state.isLimited).toBe(true);
    expect(state.requestsRemaining).toBe(0);
  });

  it('tracks different keys independently', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    rl.consume('key-a', 80);
    const stateB = rl.check('key-b');
    expect(stateB.tokensRemaining).toBe(100);
    expect(stateB.isLimited).toBe(false);
  });

  it('resets specific key', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    rl.consume('test', 80);
    rl.reset('test');
    const state = rl.check('test');
    expect(state.tokensRemaining).toBe(100);
  });

  it('resets all keys', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    rl.consume('a', 50);
    rl.consume('b', 50);
    rl.reset();
    expect(rl.check('a').tokensRemaining).toBe(100);
    expect(rl.check('b').tokensRemaining).toBe(100);
  });

  it('evicts stale entries on check', () => {
    vi.useFakeTimers();
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10, windowMs: 1000 });
    rl.consume('test', 80);
    expect(rl.check('test').tokensRemaining).toBe(20);
    vi.advanceTimersByTime(1000);
    expect(rl.check('test').tokensRemaining).toBe(100);
    vi.useRealTimers();
  });

  it('returns frozen state', () => {
    const rl = new ProviderRateLimiter({ tokensPerMin: 100, requestsPerMin: 10 });
    const state = rl.check('test');
    expect(Object.isFrozen(state)).toBe(true);
  });
});
