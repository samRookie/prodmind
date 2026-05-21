import { describe, expect, it } from 'vitest';

import { createProviderMessage,createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderFingerprinter } from '../fingerprinting/provider-fingerprint.ts';
import { ProviderHealthRegistry } from '../health/provider-health.ts';
import { ProviderRateLimiter } from '../ratelimit/provider-ratelimit.ts';
import { ProviderReplayStore } from '../replay/provider-replay.ts';
import { ProviderTelemetryCollector } from '../telemetry/provider-telemetry.ts';

function makeRequest() {
  return createProviderRequest({
    provider: 'stress-test',
    model: 'm',
    messages: [createProviderMessage({ role: 'user', content: 'hi' })],
    fingerprint: 'stress-fp',
  });
}

function makeResponse() {
  return createProviderResponse({
    provider: 'stress-test',
    model: 'm',
    text: 'ok',
    finishReason: 'stop',
  });
}

describe('Provider Layer Stress Tests', () => {
  describe('RateLimiter: high-throughput', () => {
    it('handles 1000 sequential consumes', () => {
      const rl = new ProviderRateLimiter({ tokensPerMin: 1000000, requestsPerMin: 1000000 });
      for (let i = 0; i < 1000; i++) {
        const state = rl.consume('heavy', 1);
        expect(state.isLimited).toBe(false);
      }
      expect(rl.check('heavy').requestsRemaining).toBe(999000);
    });

    it('handles 100 unique keys', () => {
      const rl = new ProviderRateLimiter({ tokensPerMin: 1000, requestsPerMin: 100 });
      for (let i = 0; i < 100; i++) {
        const state = rl.consume(`key-${i}`, 5);
        expect(state.isLimited).toBe(false);
      }
    });
  });

  describe('ReplayStore: many entries', () => {
    it('stores and retrieves 500 entries', () => {
      const store = new ProviderReplayStore();
      for (let i = 0; i < 500; i++) {
        const req = createProviderRequest({
          provider: 't', model: 'm',
          messages: [createProviderMessage({ role: 'user', content: `msg-${i}` })],
          fingerprint: `fp-${i}`,
        });
        store.record(req, makeResponse());
      }
      expect(store.getEntryCount()).toBe(500);

      const hitReq = createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'msg-42' })],
        fingerprint: 'fp-42',
      });
      const found = store.find(hitReq);
      expect(found).not.toBeNull();
      expect(store.getHitCount('fp-42')).toBe(1);
    });
  });

  describe('HealthRegistry: failure tracking', () => {
    it('tracks 50 failures after 250 successes', () => {
      const reg = new ProviderHealthRegistry({ failureThreshold: 100 });
      for (let i = 0; i < 250; i++) {
        reg.recordSuccess('busy', 50);
      }
      for (let i = 0; i < 50; i++) {
        reg.recordFailure('busy', 'err');
      }
      const health = reg.getHealth('busy');
      expect(health.successCount).toBe(250);
      expect(health.failureCount).toBe(50);
      expect(health.status).toBe('degraded');
    });
  });

  describe('TelemetryCollector: high volume', () => {
    it('handles 10000 events with max limit', () => {
      const t = new ProviderTelemetryCollector({ maxEvents: 5000 });
      for (let i = 0; i < 10000; i++) {
        t.recordRequest('t', 'm', i);
      }
      expect(t.getEventCount()).toBe(5000);
    });
  });

  describe('Fingerprinter: concurrent determinism', () => {
    it('50 concurrent fingerprints produce identical hash', async () => {
      const fp = new ProviderFingerprinter();
      const req = makeRequest();
      const results = await Promise.all(
        Array.from({ length: 50 }, () => fp.fingerprintRequest(req)),
      );
      const first = results[0]!.hash;
      for (const r of results) {
        expect(r.hash).toBe(first);
      }
    });
  });
});
