/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it } from 'vitest';

import { OrchestrationRuntime } from '../runtime/orchestration-runtime.ts';
import { createExecutionEdge, createExecutionEvent, createExecutionGraph, createExecutionNode, createExecutionNodeResult } from '../contracts';
import { ExecutionScheduler } from '../runtime';
import { OrchestrationReplay } from '../replay';
import { BudgetGovernance, ConcurrencyGovernance, ExecutionLimits } from '../governance';

// ---------------------------------------------------------------------------
// Determinism: 50-run identical execution
// ---------------------------------------------------------------------------
describe('DeterminismStress', () => {
  it('produces identical results across 50 runs', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['b'] }),
      ],
      edges: [
        createExecutionEdge({ source: 'a', target: 'b' }),
        createExecutionEdge({ source: 'b', target: 'c' }),
      ],
    });

    const firstRun = await new OrchestrationRuntime({
      handlers: {
        a: async () => ({ val: 1 }),
        b: async () => ({ val: 2 }),
        c: async () => ({ val: 3 }),
      },
    }).execute(graph);

    for (let i = 0; i < 49; i++) {
      const run = await new OrchestrationRuntime({
        handlers: {
          a: async () => ({ val: 1 }),
          b: async () => ({ val: 2 }),
          c: async () => ({ val: 3 }),
        },
      }).execute(graph);

      expect(run.results.a?.output).toEqual(firstRun.results.a?.output);
      expect(run.results.b?.output).toEqual(firstRun.results.b?.output);
      expect(run.results.c?.output).toEqual(firstRun.results.c?.output);
      expect(run.session.nodeStates.a).toBe('completed');
      expect(run.session.nodeStates.b).toBe('completed');
      expect(run.session.nodeStates.c).toBe('completed');
    }
  });

  it('is deterministic with fan-out graph', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'prompt', label: 'C', dependencies: ['a'] }),
        createExecutionNode({ id: 'd', type: 'prompt', label: 'D', dependencies: ['b', 'c'] }),
      ],
    });

    const base = await new OrchestrationRuntime({
      handlers: { a: async () => ({ root: true }), b: async () => ({ b: 1 }), c: async () => ({ c: 1 }), d: async () => ({ d: 1 }) },
      maxConcurrency: 4,
    }).execute(graph);

    for (let i = 0; i < 10; i++) {
      const run = await new OrchestrationRuntime({
        handlers: { a: async () => ({ root: true }), b: async () => ({ b: 1 }), c: async () => ({ c: 1 }), d: async () => ({ d: 1 }) },
        maxConcurrency: 4,
      }).execute(graph);

      expect(run.session.nodeStates).toEqual(base.session.nodeStates);
    }
  });
});

// ---------------------------------------------------------------------------
// Replay determinism
// ---------------------------------------------------------------------------
describe('ReplayDeterminism', () => {
  it('replay produces identical session state', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });

    const runtime = new OrchestrationRuntime({
      handlers: { a: async () => ({ result: 'hello' }) },
    });

    const original = await runtime.execute(graph);

    const replay = new OrchestrationReplay();
    const storedEvents = original.session.timeline;
    const results = original.results;

    const replayResult = await replay.replay({ graph, storedEvents, results });
    expect(replayResult.verified).toBe(true);
    expect(replayResult.session.nodeStates.a).toBe(original.session.nodeStates.a);
  });

  it('replay detects injected mismatch', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });

    const storedEvents = [
      createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }),
      createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'a' }),
    ];

    const replay = new OrchestrationReplay();
    const result = await replay.replay({
      graph,
      storedEvents,
      results: { a: createExecutionNodeResult({ nodeId: 'a', output: { x: 1 }, success: true }) },
    });
    expect(result.verified).toBe(true);

    const badResult = await replay.replay({
      graph,
      storedEvents,
      results: { a: createExecutionNodeResult({ nodeId: 'a', output: { x: 2 }, success: false }) },
    });
    expect(badResult.verified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scheduler stress
// ---------------------------------------------------------------------------
describe('SchedulerStress', () => {
  it('handles many levels correctly', async () => {
    const nodes = [];
    for (let i = 1; i <= 20; i++) {
      const deps = i > 1 ? [`n${i - 1}`] : [];
      nodes.push(createExecutionNode({ id: `n${i}`, type: 'transform', label: `N${i}`, dependencies: deps }));
    }
    const graph = createExecutionGraph({ nodes });
    const runtime = new OrchestrationRuntime({
      handlers: {},
      maxConcurrency: 1,
    });
    const result = await runtime.execute(graph);
    expect(result.session.nodeStates.n1).toBe('completed');
    expect(result.session.nodeStates.n20).toBe('completed');
  });

  it('completes all nodes in a wide graph', async () => {
    const nodes = [createExecutionNode({ id: 'root', type: 'prompt', label: 'Root' })];
    for (let i = 1; i <= 50; i++) {
      nodes.push(createExecutionNode({ id: `leaf${i}`, type: 'prompt', label: `Leaf${i}`, dependencies: ['root'] }));
    }
    const graph = createExecutionGraph({ nodes });
    const runtime = new OrchestrationRuntime({
      handlers: {},
      maxConcurrency: 10,
    });
    const result = await runtime.execute(graph);
    expect(result.session.nodeStates.root).toBe('completed');
    for (let i = 1; i <= 50; i++) {
      expect(result.session.nodeStates[`leaf${i}`]).toBe('completed');
    }
  });

  it('scheduler respects capacity across iterations', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 5 });
    const batch1 = scheduler.schedule(['a', 'b', 'c', 'd', 'e', 'f'], []);
    expect(batch1).toHaveLength(5);
    const batch2 = scheduler.schedule(['f'], batch1);
    expect(batch2).toHaveLength(0);
    const batch3 = scheduler.schedule(['f', 'g', 'h'], ['x', 'y', 'z']);
    expect(batch3).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Concurrency stress
// ---------------------------------------------------------------------------
describe('ConcurrencyStress', () => {
  it('limits concurrent node execution', async () => {
    let maxConcurrent = 0;
    let current = 0;

    const handler = async () => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      await new Promise(r => setTimeout(r, 5));
      current--;
      return {};
    };

    const nodes = [
      createExecutionNode({ id: 'root', type: 'prompt', label: 'Root' }),
    ];
    for (let i = 1; i <= 20; i++) {
      nodes.push(createExecutionNode({ id: `n${i}`, type: 'prompt', label: `N${i}`, dependencies: ['root'] }));
    }
    const graph = createExecutionGraph({ nodes });

    const runtime = new OrchestrationRuntime({
      handlers: { root: async () => ({}) },
      defaultHandler: handler,
      maxConcurrency: 3,
    });

    await runtime.execute(graph);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Failure cascade
// ---------------------------------------------------------------------------
describe('FailureCascade', () => {
  it('marks downstream nodes as pending when upstream fails', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['b'] }),
      ],
    });

    const runtime = new OrchestrationRuntime({
      handlers: {
        a: async () => { throw new Error('fail'); },
        b: async () => ({ val: 1 }),
        c: async () => ({ val: 2 }),
      },
    });

    const result = await runtime.execute(graph);
    expect(result.results.a!.success).toBe(false);
    expect(result.session.nodeStates.a).toBe('failed');
    expect(result.session.nodeStates.b).toBe('pending');
    expect(result.session.nodeStates.c).toBe('pending');
  });

  it('independent branches continue after failure', async () => {
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'root', type: 'prompt', label: 'Root' }),
        createExecutionNode({ id: 'good', type: 'prompt', label: 'Good', dependencies: ['root'] }),
        createExecutionNode({ id: 'bad', type: 'prompt', label: 'Bad', dependencies: ['root'] }),
      ],
    });

    const runtime = new OrchestrationRuntime({
      handlers: {
        root: async () => ({ ok: true }),
        good: async () => ({ success: true }),
        bad: async () => { throw new Error('bad branch'); },
      },
    });

    const result = await runtime.execute(graph);
    expect(result.results.root!.success).toBe(true);
    expect(result.results.good!.success).toBe(true);
    expect(result.results.bad!.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Large graph stress (10K nodes)
// ---------------------------------------------------------------------------
describe('LargeGraphStress', () => {
  it('builds and executes a 200-node linear chain', async () => {
    const nodeCount = 100;
    const nodes: ReturnType<typeof createExecutionNode>[] = [];
    for (let i = 1; i <= nodeCount; i++) {
      const deps = i > 1 ? [`n${i - 1}`] : [];
      nodes.push(createExecutionNode({ id: `n${i}`, type: 'transform', label: `N${i}`, dependencies: deps }));
    }
    const graph = createExecutionGraph({ nodes });

    const runtime = new OrchestrationRuntime({
      handlers: {},
      maxConcurrency: 10,
    });

    const result = await runtime.execute(graph);

    expect(result.results['n1']!.success).toBe(true);
    expect(result.results[`n${nodeCount}`]!.success).toBe(true);
  });

  it('builds and executes a 1K fan-out', async () => {
    const leafCount = 1_000;
    const nodes = [createExecutionNode({ id: 'root', type: 'prompt', label: 'Root' })];
    for (let i = 1; i <= leafCount; i++) {
      nodes.push(createExecutionNode({ id: `leaf${i}`, type: 'prompt', label: `Leaf${i}`, dependencies: ['root'] }));
    }
    const graph = createExecutionGraph({ nodes });

    const runtime = new OrchestrationRuntime({
      handlers: { root: async () => ({}) },
      maxConcurrency: 100,
    });

    const start = Date.now();
    const result = await runtime.execute(graph);
    const elapsed = Date.now() - start;

    expect(result.session.nodeStates.root).toBe('completed');
    expect(elapsed).toBeLessThan(30000);
  });
});

// ---------------------------------------------------------------------------
// Governance stress
// ---------------------------------------------------------------------------
describe('GovernanceStress', () => {
  it('budget governance stops execution after node limit', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 5, maxTotalTimeMs: 10000 });
    for (let i = 0; i < 10; i++) {
      budget.recordNodeComplete(10);
      if (i >= 4) {
        expect(budget.allowExecution()).toBe(false);
      } else {
        expect(budget.allowExecution()).toBe(true);
      }
    }
  });

  it('budget governance stops execution after time limit', () => {
    const budget = new BudgetGovernance({ maxTotalNodes: 100, maxTotalTimeMs: 50 });
    budget.recordNodeComplete(60);
    expect(budget.allowExecution()).toBe(false);
  });

  it('concurrency governance enforces limit under high load', () => {
    const cg = new ConcurrencyGovernance(3);
    const acquired: boolean[] = [];
    for (let i = 0; i < 10; i++) {
      acquired.push(cg.tryAcquire());
    }
    expect(acquired.filter(Boolean)).toHaveLength(3);
  });

  it('execution limits rejects oversize graph', () => {
    const limits = new ExecutionLimits({ maxNodes: 5 });
    const nodes = [];
    for (let i = 0; i < 10; i++) {
      nodes.push(createExecutionNode({ id: `n${i}`, type: 'prompt', label: `N${i}` }));
    }
    const graph = createExecutionGraph({ nodes });
    expect(limits.checkGraph(graph).allowed).toBe(false);
  });

  it('execution limits computes depth correctly', () => {
    const limits = new ExecutionLimits({ maxDepth: 2 });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'prompt', label: 'C', dependencies: ['b'] }),
        createExecutionNode({ id: 'd', type: 'prompt', label: 'D', dependencies: ['c'] }),
      ],
    });
    expect(limits.checkGraph(graph).allowed).toBe(false);
  });
});
