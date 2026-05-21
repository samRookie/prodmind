import { describe, it, expect } from 'vitest';
import { createExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';

describe('createExecutionSnapshot', () => {
  it('creates a snapshot with all fields', async () => {
    const snapshot = await createExecutionSnapshot({
      correlationId: 'corr-1',
      promptId: 'test-prompt',
      promptVersion: 1,
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Hello',
      systemPrompt: 'System',
      executionParams: { temperature: 0.5 },
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.correlationId).toBe('corr-1');
    expect(snapshot.provider).toBe('mock');
    expect(snapshot.executionFingerprint).toBeDefined();
    expect(snapshot.replayFingerprint).toBe('');
    expect(snapshot.status).toBe('success');
    expect(snapshot.retryCount).toBe(0);
  });

  it('computes execution fingerprint consistently', async () => {
    const s1 = await createExecutionSnapshot({
      correlationId: 'corr-1',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Hello',
      executionParams: {},
    });

    const s2 = await createExecutionSnapshot({
      correlationId: 'corr-2',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Hello',
      executionParams: {},
    });

    expect(s1.executionFingerprint).toBe(s2.executionFingerprint);
  });

  it('freezes the returned snapshot', async () => {
    const snapshot = await createExecutionSnapshot({
      correlationId: 'corr-1',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'test',
      executionParams: {},
    });

    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('computes replay fingerprint when response is provided', async () => {
    const snapshot = await createExecutionSnapshot({
      correlationId: 'corr-1',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'Hello',
      executionParams: {},
      response: {
        text: 'Hi',
        tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        latencyMs: 50,
        provider: 'mock',
        model: 'mock-model',
        finishReason: 'stop',
        toolCalls: [],
      },
    });

    expect(snapshot.replayFingerprint).toBeDefined();
    expect(snapshot.replayFingerprint.length).toBeGreaterThan(0);
  });
});
