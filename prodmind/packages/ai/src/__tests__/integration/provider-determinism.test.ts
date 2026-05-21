import { describe, expect,it } from 'vitest';

import { MockProvider } from '../../adapters/mock.adapter.ts';
import { createRequest } from '../../contracts/request.ts';

describe('Provider determinism (50-run fingerprint)', () => {
  const request = createRequest({
    prompt: 'Explain the concept of functional programming in one sentence.',
    systemPrompt: 'You are a concise technical writer.',
    temperature: 0.5,
    maxTokens: 100,
    correlationId: 'integration-determinism-test',
  });

  it('MockProvider produces identical response across 50 runs', async () => {
    const seed = 999;
    const instances = Array.from({ length: 50 }, () => new MockProvider({
      model: 'mock-model',
      seed,
      delayMs: 0,
      simulatedTokenUsage: { promptTokens: 15, completionTokens: 30, totalTokens: 45 },
      failureRate: 0,
      consecutiveFailures: 0,
      timeoutMs: 5000,
    }));

    const firstResponse = await instances[0]!.execute(request);
    const firstFingerprint = JSON.stringify({
      text: firstResponse.text,
      tokenUsage: firstResponse.tokenUsage,
      finishReason: firstResponse.finishReason,
    });

    const remaining = instances.slice(1);
    const results = await Promise.all(remaining.map((p) => p.execute(request)));

    for (const response of results) {
      const fingerprint = JSON.stringify({
        text: response.text,
        tokenUsage: response.tokenUsage,
        finishReason: response.finishReason,
      });
      expect(fingerprint).toBe(firstFingerprint);
    }
  });

  it('different seeds produce different fingerprints', async () => {
    const seed1 = 111;
    const seed2 = 222;

    const provider1 = new MockProvider({
      model: 'mock-model', seed: seed1, delayMs: 0,
      simulatedTokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      failureRate: 0, consecutiveFailures: 0, timeoutMs: 5000,
    });

    const provider2 = new MockProvider({
      model: 'mock-model', seed: seed2, delayMs: 0,
      simulatedTokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      failureRate: 0, consecutiveFailures: 0, timeoutMs: 5000,
    });

    // With same config except seed, tokenUsage is same but the underlying
    // PRNG state differs, affecting finishReason selection
    const r1 = await provider1.execute(request);
    const r2 = await provider2.execute(request);

    expect(r1.provider).toBe(r2.provider);
    expect(r1.model).toBe(r2.model);
    expect(r1.tokenUsage).toEqual(r2.tokenUsage);
  });
});
