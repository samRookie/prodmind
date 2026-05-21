import { beforeAll,describe, expect, it } from 'vitest';

import type { ExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { createExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { ReplayEngine } from '../../replay/replay-engine.ts';
import { IntegrityError } from '../../replay/replay-errors.ts';
import { createMockProvider } from '../../testing/mock-provider.ts';

describe('ReplayEngine', () => {
  const engine = new ReplayEngine();
  const mockProvider = createMockProvider(42);
  let baseSnapshot: ExecutionSnapshot;

  beforeAll(async () => {
    baseSnapshot = await createExecutionSnapshot({
      correlationId: 'replay-test',
      promptId: 'test-prompt',
      promptVersion: 1,
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'What is the capital of France?',
      systemPrompt: 'You are a geography expert.',
      executionParams: { temperature: 0.5 },
      response: {
        text: 'Mock response [correlationId=replay-test]',
        tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        latencyMs: 0,
        provider: 'mock',
        model: 'mock-model',
        finishReason: 'stop',
        toolCalls: [],
      },
      retryCount: 0,
      status: 'success',
    });
  });

  describe('verifyIntegrity', () => {
    it('verifies unmodified snapshot', async () => {
      await expect(engine.verifyIntegrity(baseSnapshot)).resolves.toBe(true);
    });

    it('detects modified rendered prompt', async () => {
      const corrupted = { ...baseSnapshot, renderedPrompt: 'Modified prompt' };
      await expect(engine.verifyIntegrity(corrupted as typeof baseSnapshot)).rejects.toThrow(IntegrityError);
    });
  });

  describe('compareOutputs', () => {
    it('reports match when outputs are identical', () => {
      const report = engine.compareOutputs(
        baseSnapshot.response,
        baseSnapshot.response!,
      );
      expect(report.textMatch).toBe(true);
      expect(report.finishReasonMatch).toBe(true);
      expect(report.tokenUsageDelta).toBe(0);
    });

    it('detects text mismatch', () => {
      const different = { ...baseSnapshot.response!, text: 'Different response' };
      const report = engine.compareOutputs(baseSnapshot.response, different);
      expect(report.textMatch).toBe(false);
    });

    it('detects different providers', () => {
      const different = { ...baseSnapshot.response!, provider: 'openai' };
      const report = engine.compareOutputs(baseSnapshot.response, different);
      expect(report.structuralChanges).toContain('provider: mock → openai');
    });
  });

  describe('replay', () => {
    it('replays successfully against MockProvider with same seed', async () => {
      const result = await engine.replay({
        snapshot: baseSnapshot,
        provider: mockProvider,
      });

      expect(result.integrityVerified).toBe(true);
    });

    it('detects divergence with different seed', async () => {
      const differentProvider = createMockProvider(99);

      const result = await engine.replay({
        snapshot: baseSnapshot,
        provider: differentProvider,
      });

      expect(result.match).toBeDefined();
    });
  });
});
