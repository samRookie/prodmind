import { describe, it, expect, vi } from 'vitest';
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

describe('OrchestrationExecutor', () => {
  it('executes a successful workflow', async () => {
    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, addOne]);
    const result = await executor.execute(workflow, 5);

    expect(result.status).toBe('completed');
    expect(result.output).toBe(11);
    expect(result.traceId).toBeTruthy();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.executionRecords.length).toBeGreaterThan(0);
  });

  it('returns failed status on error with abort policy', async () => {
    const failStep = new TransformStep({
      id: 'fail',
      name: 'Fail',
      transform: (_n: number) => { throw new Error('Intentional failure'); },
    });

    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, failStep, addOne]);
    const result = await executor.execute(workflow, 5);

    expect(result.status).toBe('failed');
    expect(result.output).toBeNull();
    expect(result.errorCode).toBeTruthy();
  });

  it('uses fallback value when policy is fallback', async () => {
    const failStep = new TransformStep({
      id: 'fail',
      name: 'Fail',
      transform: (_n: number) => { throw new Error('Intentional failure'); },
    });

    const executor = new OrchestrationExecutor();
    const workflow = sequence([double, failStep, addOne]);
    const result = await executor.execute(workflow, 5, {
      errorPolicy: 'fallback',
      fallbackValue: 999,
    });

    expect(result.status).toBe('completed');
    expect(result.output).toBe(999);
  });

  it('cancels an active workflow', async () => {
    const slowStep = new TransformStep({
      id: 'slow',
      name: 'Slow',
      transform: (n: number) => {
        const start = Date.now();
        while (Date.now() - start < 50) { /* busy wait */ }
        return n;
      },
    });

    const executor = new OrchestrationExecutor();
    const workflow = sequence([slowStep, double]);
    const workflowId = 'cancel-test';

    const promise = executor.execute(workflow, 5, { workflowId });

    executor.cancel(workflowId);

    const result = await promise;
    expect(result.status).toBe('cancelled');
    expect(result.errorCode).toBe('WORKFLOW_ABORTED');
  });

  it('getStatus returns null for unknown workflow', () => {
    const executor = new OrchestrationExecutor();
    expect(executor.getStatus('unknown')).toBeNull();
  });

  it('lifecycle hooks fire during execution', async () => {
    const lifecycleFn = vi.fn();
    const { LifecycleManager } = await import('../lifecycle.ts');
    const lifecycle = new LifecycleManager();
    lifecycle.register({
      hook: 'onWorkflowStart',
      execute() { lifecycleFn('start'); return Promise.resolve(); },
    });

    const executor = new OrchestrationExecutor({ lifecycle });
    const workflow = sequence([double]);
    await executor.execute(workflow, 5);

    expect(lifecycleFn).toHaveBeenCalledWith('start');
  });
});
