/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it } from 'vitest';

import { createExecutionGraph, createExecutionNode, OrchestrationRuntime } from '../index.ts';
import { OrchestrationExecutor } from '../index.ts';
import { TransformStep } from '../index.ts';
import { sequence } from '../index.ts';

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

describe('DAG Runtime + Workflow Engine Integration', () => {
  it('both engines can be imported from the same barrel without conflicts', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B', dependencies: ['a'] }),
      ],
    });

    const dagResult = await new OrchestrationRuntime({
      handlers: {
        a: async () => ({ val: 1 }),
        b: async () => ({ val: 2 }),
      },
    }).execute(graph);

    const workflow = sequence([double, addOne]);
    const workflowResult = await new OrchestrationExecutor().execute(workflow, 5);

    expect(dagResult.results.a?.success).toBe(true);
    expect(dagResult.results.b?.output).toEqual({ val: 2 });
    expect(workflowResult.status).toBe('completed');
    expect(workflowResult.output).toBe(11);
  });

  it('DAG runtime produces deterministic session state', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'transform', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
      ],
    });

    const result = await new OrchestrationRuntime({
      handlers: {
        a: async () => ({ x: 1 }),
        b: async (_node, ctx) => {
          const aOutput = ctx.results.a?.output as { x: number } | undefined;
          return { sum: (aOutput?.x ?? 0) + 1 };
        },
      },
    }).execute(graph);

    expect(result.session.nodeStates.a).toBe('completed');
    expect(result.session.nodeStates.b).toBe('completed');
    expect(result.results.b?.output).toEqual({ sum: 2 });
  });

  it('workflow and DAG results are independently verifiable', async () => {
    const dagGraph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'step1', type: 'transform', label: 'Step 1' }),
      ],
    });

    const dagResult = await new OrchestrationRuntime({
      handlers: { step1: async () => ({ value: 42 }) },
    }).execute(dagGraph);

    const executor = new OrchestrationExecutor();
    const wfResult = await executor.execute(sequence([double]), 21);

    expect(dagResult.results.step1?.output).toEqual({ value: 42 });
    expect(dagResult.results.step1?.success).toBe(true);
    expect(dagResult.session.nodeStates.step1).toBe('completed');
    expect(wfResult.output).toBe(42);
    expect(wfResult.status).toBe('completed');
  });
});
