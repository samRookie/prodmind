import { describe, expect,it } from 'vitest';

import { ExecutionStore } from '../../execution-history/execution-store.ts';
import { createMockProvider } from '../../testing/mock-provider.ts';
import { TransformStep } from '../step.ts';
import type { StepContext } from '../types.ts';
import { createStepInput } from '../types.ts';

const mockContext: StepContext = {
  workflowId: 'test-wf',
  stepId: 'test-step',
  executionId: 'test-exec',
  traceId: 'test-trace',
  featureFlags: {
    ENABLE_STREAMING: true,
    ENABLE_TOOL_CALLS: true,
    ENABLE_AI_ORCHESTRATION: false,
    ENABLE_MOCK_MODE: false,
    ENABLE_DETERMINISTIC_RETRY: false,
    ENABLE_CONTEXT_ASSEMBLY: false,
    ENABLE_CONTEXT_REPLAY_VALIDATION: false,
    ENABLE_CONTEXT_COMPRESSION: true,
    ENABLE_CONTEXT_DEDUP: true,
    ENABLE_CONTEXT_REPLAY_SAFE: true,
  },
  limits: {},
};

describe('TransformStep', () => {
  it('applies transform function to input data', async () => {
    const step = new TransformStep({
      id: 'double',
      name: 'Double',
      transform: (n: number) => n * 2,
    });

    const result = await step.execute(createStepInput(5), mockContext);
    expect(result.data).toBe(10);
  });

  it('sets stepId in metadata', async () => {
    const step = new TransformStep({
      id: 'upper',
      name: 'To Upper',
      transform: (s: string) => s.toUpperCase(),
    });

    const result = await step.execute(createStepInput('hello'), mockContext);
    expect(result.data).toBe('HELLO');
    expect(result.metadata.stepId).toBe('upper');
  });

  it('chains transforms', async () => {
    const double = new TransformStep({
      id: 'double',
      name: 'Double',
      transform: (n: number) => n * 2,
    });

    const addOne = new TransformStep({
      id: 'addOne',
      name: 'Add One',
      transform: (n: number) => n + 1,
    });

    const r1 = await double.execute(createStepInput(3), mockContext);
    const r2 = await addOne.execute(createStepInput(r1.data as number), mockContext);
    expect(r2.data).toBe(7);
  });
});

describe('AIProviderStep', () => {
  it('executes with mock provider', async () => {
    const { AIProviderStep } = await import('../step.ts');
    const step = new AIProviderStep({
      id: 'ai-call',
      name: 'AI Call',
      provider: createMockProvider(42),
      systemPrompt: 'You are a test assistant.',
    });

    const result = await step.execute(createStepInput('Test prompt'), mockContext);
    expect(result.data).toBeTruthy();
    expect(result.data.text).toContain('Mock response');
  });
});

describe('SnapshotStep', () => {
  it('captures snapshot during execution', async () => {
    const { SnapshotStep } = await import('../step.ts');
    const store = new ExecutionStore();
    const inner = new TransformStep({
      id: 'inner',
      name: 'Inner',
      transform: (x: string) => x.toUpperCase(),
    });

    const step = new SnapshotStep({
      id: 'snapshot',
      name: 'Snapshot',
      step: inner,
      store,
    });

    const result = await step.execute(createStepInput('hello'), mockContext);
    expect(result.data).toBe('HELLO');

    const allSnapshots = store.getAll();
    expect(allSnapshots.length).toBeGreaterThan(0);
  });
});
