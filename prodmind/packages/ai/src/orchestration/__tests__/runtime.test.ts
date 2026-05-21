/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it } from 'vitest';

import { createExecutionEdge, createExecutionGraph, createExecutionNode } from '../contracts/index.ts';
import { ExecutionRunner } from '../runtime/execution-runner.ts';
import { ExecutionScheduler } from '../runtime/execution-scheduler.ts';
import type { NodeHandler } from '../runtime/node-handler.ts';
import { createPassthroughHandler,executeHandler } from '../runtime/node-handler.ts';
import { OrchestrationRuntime } from '../runtime/orchestration-runtime.ts';
import { SessionManager } from '../runtime/session-manager.ts';

// ---------------------------------------------------------------------------
// ExecutionScheduler
// ---------------------------------------------------------------------------
describe('ExecutionScheduler', () => {
  it('respects max concurrency limit', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 2 });
    const scheduled = scheduler.schedule(['a', 'b', 'c', 'd'], []);
    expect(scheduled).toHaveLength(2);
    expect(scheduled).toEqual(['a', 'b']);
  });

  it('accounts for already-running nodes', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 3 });
    const scheduled = scheduler.schedule(['x', 'y', 'z'], ['a', 'b']);
    expect(scheduled).toHaveLength(1);
    expect(scheduled).toEqual(['x']);
  });

  it('returns empty when at capacity', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 2 });
    expect(scheduler.schedule(['a'], ['x', 'y'])).toEqual([]);
  });

  it('returns empty when no ready nodes', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 5 });
    expect(scheduler.schedule([], [])).toEqual([]);
  });

  it('clamps maxConcurrency to minimum of 1', () => {
    const scheduler = new ExecutionScheduler({ maxConcurrency: 0 });
    expect(scheduler.schedule(['a', 'b'], [])).toHaveLength(1);
  });

  it('returns frozen array', () => {
    const scheduler = new ExecutionScheduler();
    const result = scheduler.schedule(['a'], []);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NodeHandler / executeHandler
// ---------------------------------------------------------------------------
describe('executeHandler', () => {
  it('returns a successful result', async () => {
    const handler: NodeHandler = async () => ({ result: 42 });
    const node = createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' });
    const result = await executeHandler(node, handler, { sessionId: 's1', results: {}, inputs: {} });
    expect(result.nodeId).toBe('n1');
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ result: 42 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns a failed result on exception', async () => {
    const handler: NodeHandler = async () => { throw new Error('boom'); };
    const node = createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' });
    const result = await executeHandler(node, handler, { sessionId: 's1', results: {}, inputs: {} });
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('passthrough handler returns inputs', async () => {
    const fn = createPassthroughHandler();
    const node = createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' });
    const result = await executeHandler(node, fn, { sessionId: 's1', results: {}, inputs: { foo: 1 } });
    expect(result.output).toEqual({ foo: 1 });
  });
});

// ---------------------------------------------------------------------------
// ExecutionRunner
// ---------------------------------------------------------------------------
describe('ExecutionRunner', () => {
  it('runs a single node with a handler', async () => {
    const handlers = { n1: async () => ({ hello: 'world' }) };
    const runner = new ExecutionRunner({ handlers });
    const node = createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' });
    const exec = await runner.runNode(node, {}, 's1');
    expect(exec.nodeId).toBe('n1');
    expect(exec.result.success).toBe(true);
    expect(exec.result.output).toEqual({ hello: 'world' });
  });

  it('uses default handler when no specific handler is registered', async () => {
    const defaultHandler: NodeHandler = async () => ({ from: 'default' });
    const runner = new ExecutionRunner({ handlers: {}, defaultHandler });
    const node = createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' });
    const exec = await runner.runNode(node, {}, 's1');
    expect(exec.result.success).toBe(true);
    expect(exec.result.output).toEqual({ from: 'default' });
  });

  it('passes dependency results as inputs', async () => {
    const upcase: NodeHandler = async (_node, ctx) => {
      const n1 = ctx.inputs['n1'] as Record<string, unknown> | undefined;
      return { transformed: String(n1?.text ?? '').toUpperCase() };
    };
    const runner = new ExecutionRunner({ handlers: { n2: upcase } });
    const node = createExecutionNode({ id: 'n2', type: 'transform', label: 'test', dependencies: ['n1'] });
    const results = {
      n1: Object.freeze({ nodeId: 'n1', output: Object.freeze({ text: 'hello' }), durationMs: 5, success: true, error: '' }),
    };
    const exec = await runner.runNode(node, results, 's1');
    expect(exec.result.output).toEqual({ transformed: 'HELLO' });
  });

  it('runs multiple nodes sequentially via runNodes', async () => {
    const runner = new ExecutionRunner({ handlers: {} });
    const nodes = [
      createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
      createExecutionNode({ id: 'b', type: 'prompt', label: 'B' }),
    ];
    const graph = createExecutionGraph({ nodes, edges: [] });
    const executions = await runner.runNodes(['a', 'b'], graph, {}, 's1');
    expect(executions).toHaveLength(2);
  });

  it('respects abort signal', async () => {
    const runner = new ExecutionRunner({ handlers: {} });
    const nodes = [
      createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
      createExecutionNode({ id: 'b', type: 'prompt', label: 'B' }),
    ];
    const graph = createExecutionGraph({ nodes, edges: [] });
    const controller = new AbortController();
    controller.abort();
    const executions = await runner.runNodes(['a', 'b'], graph, {}, 's1', controller.signal);
    expect(executions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------
describe('SessionManager', () => {
  function makeGraph() {
    return createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
      ],
    });
  }

  it('starts all nodes as pending', () => {
    const mgr = new SessionManager(makeGraph());
    const states = mgr.getNodeStates();
    expect(states.a).toBe('pending');
    expect(states.b).toBe('pending');
  });

  it('transitions a node state', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.transition('a', 'ready');
    expect(mgr.getNodeStates().a).toBe('ready');
  });

  it('throws on invalid transition', () => {
    const mgr = new SessionManager(makeGraph());
    expect(() => mgr.transition('a', 'completed')).toThrow('Invalid transition');
  });

  it('throws on unknown node', () => {
    const mgr = new SessionManager(makeGraph());
    expect(() => mgr.transition('x', 'pending')).toThrow('Unknown node');
  });

  it('emits timeline events', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    const timeline = mgr.getTimeline();
    expect(timeline).toHaveLength(1);
    expect(timeline[0]!.type).toBe('started');
    expect(timeline[0]!.nodeId).toBe('a');
    expect(timeline[0]!.sequenceId).toBe(1);
  });

  it('recordResult transitions and emits', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    mgr.recordResult('a', Object.freeze({ nodeId: 'a', output: Object.freeze({}), durationMs: 10, success: true, error: '' }));
    expect(mgr.getNodeStates().a).toBe('completed');
    const timeline = mgr.getTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[1]!.type).toBe('completed');
  });

  it('recordResult records failure', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    mgr.recordResult('a', Object.freeze({ nodeId: 'a', output: Object.freeze({}), durationMs: 5, success: false, error: 'oops' }));
    expect(mgr.getNodeStates().a).toBe('failed');
    const timeline = mgr.getTimeline();
    expect(timeline[1]!.type).toBe('failed');
    expect(timeline[1]!.data.error).toBe('oops');
  });

  it('markReady transitions to ready', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markReady('a');
    expect(mgr.getNodeStates().a).toBe('ready');
  });

  it('getRunning returns running nodes', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    expect(mgr.getRunning()).toEqual(['a']);
  });

  it('getState returns correct summary', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    mgr.recordResult('a', Object.freeze({ nodeId: 'a', output: Object.freeze({}), durationMs: 1, success: true, error: '' }));
    const state = mgr.getState();
    expect(state.running).toEqual([]);
    expect(state.completed).toEqual(['a']);
    expect(state.allDone).toBe(false);
    expect(state.hasFailed).toBe(false);
  });

  it('allDone becomes true when all nodes complete', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    mgr.recordResult('a', Object.freeze({ nodeId: 'a', output: Object.freeze({}), durationMs: 1, success: true, error: '' }));
    mgr.markRunning('b');
    mgr.recordResult('b', Object.freeze({ nodeId: 'b', output: Object.freeze({}), durationMs: 1, success: true, error: '' }));
    expect(mgr.getState().allDone).toBe(true);
  });

  it('hasFailed is true when any node fails', () => {
    const mgr = new SessionManager(makeGraph());
    mgr.markRunning('a');
    mgr.recordResult('a', Object.freeze({ nodeId: 'a', output: Object.freeze({}), durationMs: 1, success: false, error: 'fail' }));
    expect(mgr.getState().hasFailed).toBe(true);
  });

  it('returns frozen state objects', () => {
    const mgr = new SessionManager(makeGraph());
    expect(Object.isFrozen(mgr.getNodeStates())).toBe(true);
    expect(Object.isFrozen(mgr.getTimeline())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// OrchestrationRuntime
// ---------------------------------------------------------------------------
describe('OrchestrationRuntime', () => {
  it('executes a single-node graph', async () => {
    const runtime = new OrchestrationRuntime({
      handlers: { a: async () => ({ done: true }) },
    });
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const { session, results } = await runtime.execute(graph);
    expect(results.a).toBeDefined();
    expect(results.a!.success).toBe(true);
    expect(results.a!.output).toEqual({ done: true });
    expect(session.nodeStates.a).toBe('completed');
  });

  it('executes a linear graph sequentially', async () => {
    const order: string[] = [];
    const runtime = new OrchestrationRuntime({
      handlers: {
        a: async () => { order.push('a'); return { val: 1 }; },
        b: async () => { order.push('b'); return { val: 2 }; },
        c: async () => { order.push('c'); return { val: 3 }; },
      },
    });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['b'] }),
      ],
    });
    const { results } = await runtime.execute(graph);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(results.a!.success).toBe(true);
    expect(results.b!.success).toBe(true);
    expect(results.c!.success).toBe(true);
  });

  it('executes a fan-out graph in parallel', async () => {
    const runtime = new OrchestrationRuntime({
      handlers: {
        a: async () => ({ root: true }),
        b: async () => ({ leaf: 'B' }),
        c: async () => ({ leaf: 'C' }),
      },
      maxConcurrency: 4,
    });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['a'] }),
      ],
      edges: [
        createExecutionEdge({ source: 'a', target: 'b' }),
        createExecutionEdge({ source: 'a', target: 'c' }),
      ],
    });
    const { results } = await runtime.execute(graph);
    expect(results.a!.success).toBe(true);
    expect(results.b!.success).toBe(true);
    expect(results.c!.success).toBe(true);
  });

  it('handles node failure and continues', async () => {
    const runtime = new OrchestrationRuntime({
      handlers: {
        a: async () => ({ ok: true }),
        b: async () => { throw new Error('b failed'); },
        c: async () => ({ val: 'c-result' }),
      },
    });
    const graph = createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'prompt', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'prompt', label: 'C', dependencies: ['a'] }),
      ],
    });
    const { results } = await runtime.execute(graph);
    expect(results.a!.success).toBe(true);
    expect(results.b!.success).toBe(false);
    expect(results.c!.success).toBe(true);
  });

  it('returns frozen result', async () => {
    const runtime = new OrchestrationRuntime({
      handlers: { a: async () => ({}) },
    });
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const result = await runtime.execute(graph);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.results)).toBe(true);
  });
});
