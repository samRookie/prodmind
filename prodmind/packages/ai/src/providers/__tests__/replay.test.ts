import { describe, expect, it } from 'vitest';

import { createProviderMessage,createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderReplayStore } from '../replay/provider-replay.ts';

function makeRequest(fingerprint?: string) {
  return createProviderRequest({
    provider: 'test',
    model: 'm',
    messages: [createProviderMessage({ role: 'user', content: 'hi' })],
    fingerprint,
  });
}

function makeResponse() {
  return createProviderResponse({
    provider: 'test',
    model: 'm',
    text: 'replayed response',
    finishReason: 'stop',
    tokenUsage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
  });
}

describe('ProviderReplayStore', () => {
  describe('record and find', () => {
    it('stores and retrieves by fingerprint', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest('fp1');
      const res = makeResponse();
      store.record(req, res);

      const found = store.find(req);
      expect(found).not.toBeNull();
      expect(found?.text).toBe('replayed response');
    });

    it('falls back to request id when no fingerprint', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest();
      const res = makeResponse();
      store.record(req, res);

      const found = store.find(req);
      expect(found).not.toBeNull();
    });

    it('returns null for unknown request', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest('unknown');
      expect(store.find(req)).toBeNull();
    });

    it('returns frozen response', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest('fp1');
      store.record(req, makeResponse());
      const found = store.find(req);
      expect(Object.isFrozen(found)).toBe(true);
    });
  });

  describe('getHitCount', () => {
    it('starts at zero', () => {
      const store = new ProviderReplayStore();
      expect(store.getHitCount('fp1')).toBe(0);
    });

    it('increments on find', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest('fp1');
      store.record(req, makeResponse());
      store.find(req);
      store.find(req);
      expect(store.getHitCount('fp1')).toBe(2);
    });

    it('returns total hit count without key', () => {
      const store = new ProviderReplayStore();
      const r1 = makeRequest('a');
      const r2 = makeRequest('b');
      store.record(r1, makeResponse());
      store.record(r2, makeResponse());
      store.find(r1);
      store.find(r2);
      store.find(r2);
      expect(store.getHitCount()).toBe(3);
    });
  });

  describe('getEntryCount', () => {
    it('returns stored entry count', () => {
      const store = new ProviderReplayStore();
      store.record(makeRequest('a'), makeResponse());
      store.record(makeRequest('b'), makeResponse());
      expect(store.getEntryCount()).toBe(2);
    });
  });

  describe('getAllEntries', () => {
    it('returns all entries', () => {
      const store = new ProviderReplayStore();
      store.record(makeRequest('a'), makeResponse());
      expect(store.getAllEntries()).toHaveLength(1);
      expect(Object.isFrozen(store.getAllEntries())).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears specific entry', () => {
      const store = new ProviderReplayStore();
      store.record(makeRequest('a'), makeResponse());
      store.record(makeRequest('b'), makeResponse());
      store.clear('a');
      expect(store.getEntryCount()).toBe(1);
    });

    it('clears all entries', () => {
      const store = new ProviderReplayStore();
      store.record(makeRequest('a'), makeResponse());
      store.record(makeRequest('b'), makeResponse());
      store.clear();
      expect(store.getEntryCount()).toBe(0);
    });

    it('resets hit count on clear', () => {
      const store = new ProviderReplayStore();
      const req = makeRequest('a');
      store.record(req, makeResponse());
      store.find(req);
      store.clear('a');
      expect(store.getHitCount('a')).toBe(0);
    });
  });
});
