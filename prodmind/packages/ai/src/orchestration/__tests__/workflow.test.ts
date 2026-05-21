import { describe, expect,it } from 'vitest';

import { CompositionError } from '../errors.ts';
import { TransformStep } from '../step.ts';
import type { StepContext, StepInput } from '../types.ts';
import { createStepInput } from '../types.ts';
import { conditional, map,parallel, sequence } from '../workflow.ts';

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

describe('sequence', () => {
  it('executes steps in order', async () => {
    const seq = sequence([double, addOne]);
    const result = await seq.execute(createStepInput(3), mockContext);
    expect(result.data).toBe(7);
  });

  it('pipes output of one step to next', async () => {
    const seq = sequence([addOne, double]);
    const result = await seq.execute(createStepInput(3), mockContext);
    expect(result.data).toBe(8);
  });

  it('handles single step sequences', async () => {
    const seq = sequence([double]);
    const result = await seq.execute(createStepInput(5), mockContext);
    expect(result.data).toBe(10);
  });

  it('throws CompositionError for empty sequences', () => {
    expect(() => sequence([])).toThrow(CompositionError);
  });

  it('chains multiple steps', async () => {
    const seq = sequence([addOne, double, addOne, double]);
    const result = await seq.execute(createStepInput(1), mockContext);
    expect(result.data).toBe(10);
  });
});

describe('parallel', () => {
  it('executes steps and returns combined results', async () => {
    const par = parallel([double, addOne]);
    const result = await par.execute(createStepInput(5), mockContext);
    expect(Array.isArray(result.data)).toBe(true);
    const data = result.data as unknown as number[];
    expect(data[0]).toBe(10);
    expect(data[1]).toBe(6);
  });

  it('throws CompositionError for empty parallel', () => {
    expect(() => parallel([])).toThrow(CompositionError);
  });
});

describe('conditional', () => {
  it('executes ifStep when predicate is true', async () => {
    const cond = conditional<number, number>(
      (n) => n > 10,
      double,
      addOne,
    );
    const result = await cond.execute(createStepInput(15), mockContext);
    expect(result.data).toBe(30);
  });

  it('executes elseStep when predicate is false', async () => {
    const cond = conditional<number, number>(
      (n) => n > 10,
      double,
      addOne,
    );
    const result = await cond.execute(createStepInput(5), mockContext);
    expect(result.data).toBe(6);
  });

  it('passes through when no elseStep and predicate is false', async () => {
    const cond = conditional<number, number>(
      (n) => n > 10,
      double,
    );
    const result = await cond.execute(createStepInput(5), mockContext);
    expect(result.data).toBe(5);
    expect(result.metadata.skipped).toBe(true);
  });
});

describe('map', () => {
  it('applies mapper to each element', async () => {
    const m = map<number, number>(double);
    const input = createStepInput([1, 2, 3, 4]) as unknown as StepInput<number>;
    const result = await m.execute(input, mockContext);
    expect(Array.isArray(result.data)).toBe(true);
    const data = result.data as unknown as number[];
    expect(data).toEqual([2, 4, 6, 8]);
  });

  it('throws CompositionError for non-array input', async () => {
    const m = map<number, number>(double);
    const input = createStepInput('not-array') as unknown as StepInput<number>;
    await expect(
      m.execute(input, mockContext),
    ).rejects.toThrow(CompositionError);
  });
});
