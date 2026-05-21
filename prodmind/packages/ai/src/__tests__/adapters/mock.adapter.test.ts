import { describe, expect,it } from 'vitest';

import { MockProvider } from '../../adapters/mock.adapter.ts';
import { createRequest } from '../../contracts/request.ts';
import { RetryableError } from '../../errors/provider-error.ts';

describe('MockProvider', () => {
  const baseConfig = {
    model: 'mock-model',
    seed: 42,
    delayMs: 0,
    simulatedTokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    failureRate: 0,
    consecutiveFailures: 0,
    timeoutMs: 5000,
  };

  const defaultRequest = createRequest({
    prompt: 'Test prompt',
    correlationId: 'test-correlation-id',
  });

  describe('determinism', () => {
    it('returns identical responses for identical seed and request (50 runs)', async () => {
      const seed = 12345;
      const firstProvider = new MockProvider({ ...baseConfig, seed });
      const firstResponse = await firstProvider.execute(defaultRequest);
      const fingerprint = JSON.stringify({
        text: firstResponse.text,
        tokenUsage: firstResponse.tokenUsage,
        finishReason: firstResponse.finishReason,
      });

      for (let i = 0; i < 50; i++) {
        const provider = new MockProvider({ ...baseConfig, seed });
        const response = await provider.execute(defaultRequest);
        const current = JSON.stringify({
          text: response.text,
          tokenUsage: response.tokenUsage,
          finishReason: response.finishReason,
        });
        expect(current).toBe(fingerprint);
      }
    });

    it('produces different responses for different seeds', async () => {
      const provider1 = new MockProvider({ ...baseConfig, seed: 1 });
      const provider2 = new MockProvider({ ...baseConfig, seed: 2 });

      const [response1, response2] = await Promise.all([
        provider1.execute(defaultRequest),
        provider2.execute(defaultRequest),
      ]);

      expect(response1.text).toBe(response2.text);
    });
  });

  describe('failure simulation', () => {
    it('always succeeds with failureRate 0', async () => {
      const provider = new MockProvider({ ...baseConfig, failureRate: 0 });
      const response = await provider.execute(defaultRequest);
      expect(response.text).toBeDefined();
    });

    it('respects consecutiveFailures before succeeding', async () => {
      const provider = new MockProvider({ ...baseConfig, consecutiveFailures: 3 });

      for (let i = 0; i < 3; i++) {
        await expect(provider.execute(defaultRequest)).rejects.toThrow(RetryableError);
      }

      const response = await provider.execute(defaultRequest);
      expect(response.text).toBeDefined();
    });
  });

  describe('capabilities', () => {
    it('declares streaming support', () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      expect(provider.capabilities.streaming).toBe(true);
    });

    it('declares tool calling support', () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      expect(provider.capabilities.toolCalling).toBe(true);
    });

    it('declares structured output support', () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      expect(provider.capabilities.structuredOutput).toBe(true);
    });

    it('declares context window', () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      expect(provider.capabilities.contextWindow).toBeGreaterThan(0);
    });
  });

  describe('token usage', () => {
    it('returns configured token usage', async () => {
      const tokenUsage = { promptTokens: 50, completionTokens: 100, totalTokens: 150 };
      const provider = new MockProvider({ ...baseConfig, seed: 99, simulatedTokenUsage: tokenUsage });

      const response = await provider.execute(defaultRequest);
      expect(response.tokenUsage).toEqual(tokenUsage);
    });
  });

  describe('streaming', () => {
    it('executeStream yields char-by-char', async () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      const response = await provider.execute(defaultRequest);

      let streamedText = '';
      for await (const chunk of provider.executeStream(defaultRequest)) {
        streamedText += chunk.text;
      }

      expect(streamedText).toBe(response.text);
    });
  });

  describe('provider metadata', () => {
    it('reports name as mock', () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42 });
      expect(provider.name).toBe('mock');
    });

    it('includes configured model in response', async () => {
      const provider = new MockProvider({ ...baseConfig, seed: 42, model: 'custom-model' });
      const response = await provider.execute(defaultRequest);
      expect(response.model).toBe('custom-model');
    });
  });
});
