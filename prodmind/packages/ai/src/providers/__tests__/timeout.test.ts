import { describe, expect, it } from 'vitest';

import { ProviderTimeoutError } from '../errors/provider-errors.ts';
import { ProviderTimeout } from '../timeout/provider-timeout.ts';

describe('ProviderTimeout', () => {
  const t = new ProviderTimeout();

  describe('createPolicy', () => {
    it('creates default policy', () => {
      const p = t.createPolicy();
      expect(p.connectMs).toBe(10000);
      expect(p.readMs).toBe(30000);
      expect(p.writeMs).toBe(10000);
      expect(p.totalMs).toBe(60000);
    });

    it('merges overrides', () => {
      const p = t.createPolicy({ connectMs: 5000, totalMs: 30000 });
      expect(p.connectMs).toBe(5000);
      expect(p.readMs).toBe(30000);
      expect(p.totalMs).toBe(30000);
    });

    it('returns frozen policy', () => {
      const p = t.createPolicy();
      expect(Object.isFrozen(p)).toBe(true);
    });
  });

  describe('enforceTotalTimeout', () => {
    it('does not throw when within limit', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(() => t.enforceTotalTimeout(p, 50, 'test')).not.toThrow();
    });

    it('throws when total timeout exceeded', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(() => t.enforceTotalTimeout(p, 100, 'test')).toThrow(ProviderTimeoutError);
      expect(() => t.enforceTotalTimeout(p, 150, 'test')).toThrow(ProviderTimeoutError);
    });

    it('includes provider name and elapsed in error', () => {
      const p = t.createPolicy({ totalMs: 50 });
      try {
        t.enforceTotalTimeout(p, 100, 'my-provider');
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(ProviderTimeoutError);
        if (e instanceof ProviderTimeoutError) {
          expect(e.provider).toBe('my-provider');
          expect(e.message).toContain('100ms');
        }
      }
    });
  });

  describe('enforceConnectTimeout', () => {
    it('does not throw when within limit', () => {
      const p = t.createPolicy({ connectMs: 50 });
      expect(() => t.enforceConnectTimeout(p, 30, 't')).not.toThrow();
    });

    it('throws when connect timeout exceeded', () => {
      const p = t.createPolicy({ connectMs: 50 });
      expect(() => t.enforceConnectTimeout(p, 50, 't')).toThrow(ProviderTimeoutError);
    });
  });

  describe('getRemainingMs', () => {
    it('returns positive remaining time', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(t.getRemainingMs(p, 30)).toBe(70);
    });

    it('returns 0 when exceeded', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(t.getRemainingMs(p, 150)).toBe(0);
    });
  });

  describe('hasExpired', () => {
    it('returns false when within limit', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(t.hasExpired(p, 50)).toBe(false);
    });

    it('returns true when limit reached', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(t.hasExpired(p, 100)).toBe(true);
    });

    it('returns true when exceeded', () => {
      const p = t.createPolicy({ totalMs: 100 });
      expect(t.hasExpired(p, 200)).toBe(true);
    });
  });
});
