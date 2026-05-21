/* eslint-disable @typescript-eslint/require-await */
import { describe, expect, it } from 'vitest';

import { ExecutionPlanner } from '../planner/execution-planner.ts';
import { OrchestrationAIAdapter } from '../planner/orchestration-adapter.ts';
import type { ProviderFn } from '../planner/provider-bridge.ts';
import { ProviderExecutionBridge } from '../planner/provider-bridge.ts';

// ---------------------------------------------------------------------------
// ExecutionPlanner
// ---------------------------------------------------------------------------
describe('ExecutionPlanner', () => {
  const planner = new ExecutionPlanner();

  it('plans a simple description as single-node graph', () => {
    const graph = planner.plan({ description: 'analyze sentiment' });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]!.label).toBe('analyze sentiment');
    expect(graph.nodes[0]!.id).toBe('task');
  });

  it('plans from explicit nodes', () => {
    const graph = planner.plan({
      description: 'custom',
      nodes: [
        { id: 'a', type: 'prompt', label: 'Input' },
        { id: 'b', type: 'transform', label: 'Process', dependencies: ['a'] },
      ],
    });
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]!.source).toBe('a');
    expect(graph.edges[0]!.target).toBe('b');
  });

  it('planChain creates linear sequence', () => {
    const graph = planner.planChain(['step1', 'step2', 'step3']);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.nodes[0]!.dependencies).toEqual([]);
    expect(graph.nodes[1]!.dependencies).toEqual(['step_1']);
    expect(graph.nodes[2]!.dependencies).toEqual(['step_2']);
  });

  it('planFanOut creates root with multiple leaves', () => {
    const graph = planner.planFanOut('query', ['a', 'b', 'c']);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.nodes[0]!.id).toBe('root');
    expect(graph.nodes[1]!.dependencies).toEqual(['root']);
    expect(graph.nodes[2]!.dependencies).toEqual(['root']);
    expect(graph.nodes[3]!.dependencies).toEqual(['root']);
  });

  it('planPipeline creates typed stages', () => {
    const graph = planner.planPipeline([
      { label: 'Extract', type: 'prompt' },
      { label: 'Transform', type: 'transform' },
      { label: 'Validate', type: 'validation' },
    ]);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0]!.type).toBe('prompt');
    expect(graph.nodes[1]!.type).toBe('transform');
    expect(graph.nodes[2]!.type).toBe('validation');
  });
});

// ---------------------------------------------------------------------------
// ProviderExecutionBridge
// ---------------------------------------------------------------------------
describe('ProviderExecutionBridge', () => {
  const bridge = new ProviderExecutionBridge();

  it('creates a handler that calls the provider', async () => {
    const mockProvider: ProviderFn = async input => ({
      text: `response to: ${input.prompt}`,
    });

    const handler = bridge.createHandler(mockProvider);
    const node = Object.freeze({ id: 'n1', type: 'prompt', label: 'hello', config: Object.freeze({}), dependencies: Object.freeze([]) });
    const result = await handler(node, { sessionId: 's1', results: {}, inputs: {} });

    expect(result.text).toBe('response to: hello');
  });

  it('extracts prompt from config when available', async () => {
    const mockProvider: ProviderFn = async input => ({
      text: `reply: ${input.prompt}`,
    });

    const handler = bridge.createHandler(mockProvider);
    const node = Object.freeze({ id: 'n1', type: 'prompt', label: 'ignored', config: Object.freeze({ prompt: 'custom prompt' }), dependencies: Object.freeze([]) });
    const result = await handler(node, { sessionId: 's1', results: {}, inputs: {} });

    expect(result.text).toBe('reply: custom prompt');
  });

  it('passthrough bridge returns inputs with bridged flag', async () => {
    const handler = bridge.createPassthroughBridge();
    const node = Object.freeze({ id: 'n1', type: 'prompt', label: 'x', config: Object.freeze({}), dependencies: Object.freeze([]) });
    const result = await handler(node, { sessionId: 's1', results: {}, inputs: { foo: 1 } });

    expect(result.bridged).toBe(true);
    expect(result.foo).toBe(1);
  });

  it('provider receives optional params', async () => {
    const received: unknown[] = [];
    const mockProvider: ProviderFn = async input => {
      received.push(input);
      return { text: 'ok' };
    };

    const handler = bridge.createHandler(mockProvider, { model: 'gpt-4', temperature: 0.5 });
    const node = Object.freeze({ id: 'n1', type: 'prompt', label: 'test', config: Object.freeze({ system: 'be helpful' }), dependencies: Object.freeze([]) });
    await handler(node, { sessionId: 's1', results: {}, inputs: {} });

    expect(received[0]).toMatchObject({ model: 'gpt-4', temperature: 0.5, system: 'be helpful' });
  });
});

// ---------------------------------------------------------------------------
// OrchestrationAIAdapter
// ---------------------------------------------------------------------------
describe('OrchestrationAIAdapter', () => {
  it('runs a planned graph through the adapter', async () => {
    const mockProvider: ProviderFn = async () => ({ text: 'done' });
    const adapter = new OrchestrationAIAdapter({ provider: mockProvider });

    const result = await adapter.run({ description: 'test task' });
    expect(result.results['task']).toBeDefined();
    expect(result.results['task']!.success).toBe(true);
  });

  it('runs a pre-built graph', async () => {
    const mockProvider: ProviderFn = async () => ({ text: 'ok' });
    const adapter = new OrchestrationAIAdapter({ provider: mockProvider });

    const { createExecutionGraph, createExecutionNode } = await import('../contracts/index.ts');
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'n1', type: 'prompt', label: 'test' })],
    });
    const result = await adapter.runGraph(graph);
    expect(result.results['n1']!.success).toBe(true);
  });

  it('exposes the planner', () => {
    const mockProvider: ProviderFn = async () => ({ text: '' });
    const adapter = new OrchestrationAIAdapter({ provider: mockProvider });
    expect(adapter.getPlanner()).toBeInstanceOf(ExecutionPlanner);
  });
});
