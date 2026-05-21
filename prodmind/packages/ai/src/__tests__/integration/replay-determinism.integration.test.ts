import { describe, it, expect } from 'vitest';
import { ReplayEngine } from '../../replay/replay-engine.ts';
import { createExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { createMockProvider } from '../../testing/mock-provider.ts';

describe('Replay determinism (50-run fingerprint)', () => {
  const engine = new ReplayEngine();

  it('replay with same seed produces identical results across 50 runs', async () => {
    const seed = 42;
    const provider = createMockProvider(seed);

    const originalSnapshot = await createExecutionSnapshot({
      correlationId: 'replay-det-test',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Explain functional programming in one sentence.',
      systemPrompt: 'You are a concise technical writer.',
      executionParams: { temperature: 0.5, maxTokens: 100 },
      response: {
        text: 'Mock response [correlationId=replay-det-test]',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 0,
        provider: 'mock',
        model: 'mock-model',
        finishReason: 'stop',
        toolCalls: [],
      },
      status: 'success',
    });

    const firstResult = await engine.replay({
      snapshot: originalSnapshot,
      provider,
    });

    const firstFingerprint = firstResult.replayed.replayFingerprint;

    for (let i = 0; i < 50; i++) {
      const replayResult = await engine.replay({
        snapshot: originalSnapshot,
        provider: createMockProvider(seed),
      });

      expect(replayResult.replayed.replayFingerprint).toBe(firstFingerprint);
    }
  });

  it('different inputs produce different fingerprints', async () => {
    const s1 = await createExecutionSnapshot({
      correlationId: 'diff-input-1',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'What is the meaning of life?',
      executionParams: {},
      response: {
        text: 'Mock response [correlationId=diff-input-1]',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 0,
        provider: 'mock',
        model: 'mock-model',
        finishReason: 'stop',
        toolCalls: [],
      },
      status: 'success',
    });

    const s2 = await createExecutionSnapshot({
      correlationId: 'diff-input-2',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Explain quantum computing.',
      executionParams: {},
      response: {
        text: 'Mock response [correlationId=diff-input-2]',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 0,
        provider: 'mock',
        model: 'mock-model',
        finishReason: 'stop',
        toolCalls: [],
      },
      status: 'success',
    });

    expect(s1.executionFingerprint).not.toBe(s2.executionFingerprint);
    expect(s1.replayFingerprint).not.toBe(s2.replayFingerprint);
  });
});
