import { describe, expect, it } from 'vitest';

import { ProviderHealthRegistry } from '../health/provider-health.ts';

describe('ProviderHealthRegistry', () => {
  describe('getHealth', () => {
    it('returns healthy by default', () => {
      const reg = new ProviderHealthRegistry();
      const health = reg.getHealth('openai');
      expect(health.status).toBe('healthy');
      expect(health.failureCount).toBe(0);
      expect(health.successCount).toBe(0);
    });

    it('returns same instance for repeated calls', () => {
      const reg = new ProviderHealthRegistry();
      const a = reg.getHealth('t');
      const b = reg.getHealth('t');
      expect(a).toBe(b);
    });
  });

  describe('recordSuccess', () => {
    it('increments success count', () => {
      const reg = new ProviderHealthRegistry();
      const health = reg.recordSuccess('openai', 100);
      expect(health.successCount).toBe(1);
      expect(health.failureCount).toBe(0);
    });

    it('computes moving average latency', () => {
      const reg = new ProviderHealthRegistry();
      reg.recordSuccess('t', 100);
      const health = reg.recordSuccess('t', 200);
      expect(health.avgLatencyMs).toBe(150);
    });

    it('resets failure count on success', () => {
      const reg = new ProviderHealthRegistry({ failureThreshold: 3 });
      reg.recordFailure('t');
      reg.recordFailure('t');
      const health = reg.recordSuccess('t', 50);
      expect(health.failureCount).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('increments failure count', () => {
      const reg = new ProviderHealthRegistry();
      const health = reg.recordFailure('t');
      expect(health.failureCount).toBe(1);
    });

    it('marks degraded on first failure', () => {
      const reg = new ProviderHealthRegistry({ failureThreshold: 3 });
      const health = reg.recordFailure('t');
      expect(health.status).toBe('degraded');
    });

    it('marks unavailable at threshold', () => {
      const reg = new ProviderHealthRegistry({ failureThreshold: 2 });
      reg.recordFailure('t');
      const health = reg.recordFailure('t');
      expect(health.status).toBe('unavailable');
    });

    it('stores last error', () => {
      const reg = new ProviderHealthRegistry();
      reg.recordFailure('t', 'connection refused');
      expect(reg.getHealth('t').lastError).toBe('connection refused');
    });
  });

  describe('markDegraded / markUnavailable / markHealthy', () => {
    it('marks degraded', () => {
      const reg = new ProviderHealthRegistry();
      const health = reg.markDegraded('t', 'slow');
      expect(health.status).toBe('degraded');
    });

    it('marks unavailable', () => {
      const reg = new ProviderHealthRegistry();
      const health = reg.markUnavailable('t', 'down');
      expect(health.status).toBe('unavailable');
    });

    it('marks healthy', () => {
      const reg = new ProviderHealthRegistry();
      reg.markDegraded('t');
      const health = reg.markHealthy('t');
      expect(health.status).toBe('healthy');
    });
  });

  describe('isAvailable', () => {
    it('returns true for healthy', () => {
      const reg = new ProviderHealthRegistry();
      expect(reg.isAvailable('t')).toBe(true);
    });

    it('returns false for unavailable', () => {
      const reg = new ProviderHealthRegistry();
      reg.markUnavailable('t');
      expect(reg.isAvailable('t')).toBe(false);
    });
  });

  describe('getAllHealth / reset', () => {
    it('returns all tracked health states', () => {
      const reg = new ProviderHealthRegistry();
      reg.getHealth('a');
      reg.getHealth('b');
      expect(reg.getAllHealth().length).toBe(2);
    });

    it('resets a provider', () => {
      const reg = new ProviderHealthRegistry();
      reg.recordFailure('t');
      reg.reset('t');
      expect(reg.getHealth('t').failureCount).toBe(0);
    });
  });
});
