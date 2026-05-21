import { describe, expect, it, vi } from 'vitest';

import { createProviderMessage,createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderIsolation } from '../isolation/provider-isolation.ts';

function makeRequest() {
  return createProviderRequest({
    provider: 'test',
    model: 'm',
    messages: [createProviderMessage({ role: 'user', content: 'hi' })],
  });
}

function makeResponse() {
  return createProviderResponse({
    provider: 'test',
    model: 'm',
    text: 'hello',
    finishReason: 'stop',
  });
}

describe('ProviderIsolation', () => {
  const iso = new ProviderIsolation();

  describe('execute', () => {
    it('returns response on success', async () => {
      const result = await iso.execute(makeRequest(), () => Promise.resolve(makeResponse()));
      expect(result.response).not.toBeNull();
      expect(result.response?.text).toBe('hello');
      expect(result.error).toBeNull();
    });

    it('captures error on failure', async () => {
      const result = await iso.execute(makeRequest(), () => Promise.reject(new Error('network error')));
      expect(result.response).toBeNull();
      expect(result.error?.message).toBe('network error');
    });

    it('records durationMs', async () => {
      const result = await iso.execute(makeRequest(), async () => {
        await new Promise(r => setTimeout(r, 10));
        return makeResponse();
      });
      expect(result.durationMs).toBeGreaterThanOrEqual(5);
    });

    it('returns frozen result', async () => {
      const result = await iso.execute(makeRequest(), () => Promise.resolve(makeResponse()));
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('executeWithRetry', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue(makeResponse());
      const result = await iso.executeWithRetry(makeRequest(), fn);
      expect(result.response?.text).toBe('hello');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce(makeResponse());

      const result = await iso.executeWithRetry(makeRequest(), fn, { maxRetries: 3 });
      expect(result.response?.text).toBe('hello');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('returns last error after all retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent'));
      const result = await iso.executeWithRetry(makeRequest(), fn, { maxRetries: 2 });
      expect(result.response).toBeNull();
      expect(result.error?.message).toBe('persistent');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateResponse', () => {
    it('does not throw for valid response', () => {
      expect(() => iso.validateResponse(makeResponse())).not.toThrow();
    });
  });
});
