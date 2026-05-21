import { describe, it, expect } from 'vitest';
import { OrchestrationExecutor } from '../executor.ts';
import { sequence } from '../workflow.ts';
import { TransformStep } from '../step.ts';

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

describe('Determinism integration (50-run fingerprint)', () => {
  it('sequence produces same output across 50 runs', async () => {
    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, addOne, double]);

    const firstResult = await executor.execute(workflow, 3);

    for (let i = 0; i < 50; i++) {
      const result = await executor.execute(workflow, 3);
      expect(result.status).toBe(firstResult.status);
      expect(result.output).toBe(firstResult.output);
      expect(result.executionRecords.length).toBe(firstResult.executionRecords.length);
    }
  });

  it('different inputs produce different outputs', async () => {
    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, addOne]);

    const result1 = await executor.execute(workflow, 3);
    const result2 = await executor.execute(workflow, 10);

    expect(result1.output).toBe(7);
    expect(result2.output).toBe(21);
    expect(result1.output).not.toBe(result2.output);
  });

  it('execution record structure is consistent across runs', async () => {
    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, addOne]);

    const result = await executor.execute(workflow, 3);

    expect(result.executionRecords).toHaveLength(1);
    expect(result.executionRecords[0]!.status).toBe('completed');
    expect(result.executionRecords[0]!.stepId).toBeTruthy();
    expect(result.executionRecords[0]!.durationMs).toBeGreaterThanOrEqual(0);

    for (const record of result.executionRecords) {
      const keys = Object.keys(record).sort();
      expect(keys).toEqual([
        'durationMs',
        'errorCode',
        'errorMessage',
        'inputFingerprint',
        'outputFingerprint',
        'status',
        'stepId',
        'stepName',
        'traceId',
      ]);
    }
  });
});
