import { describe, expect, it } from 'vitest';

import type { ExecutionState } from '../contracts/index.ts';
import { createExecutionEdge,createExecutionGraph, createExecutionNode } from '../contracts/index.ts';
import { detectCycles } from '../graph/cycle-detector.ts';
import { DAGBuilder } from '../graph/dag-builder.ts';
import { getBlockedNodes, getExecutionFrontier,getReadyNodes } from '../graph/dependency-resolver.ts';
import { topologicalSort, topologicalSortWithLevels } from '../graph/topological-sort.ts';

describe('DAGBuilder', () => {
  it('builds a valid graph', () => {
    const builder = new DAGBuilder('g1');
    const result = builder
      .addNode({ id: 'n1', type: 'prompt', label: 'first' })
      .addNode({ id: 'n2', type: 'transform', label: 'second', dependencies: ['n1'] })
      .addEdge({ source: 'n1', target: 'n2' })
      .build();

    expect(result.valid).toBe(true);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toHaveLength(1);
  });

  it('rejects empty graph', () => {
    const result = new DAGBuilder().build();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least one node'))).toBe(true);
  });

  it('rejects edge to unknown source', () => {
    const result = new DAGBuilder()
      .addNode({ id: 'n1', type: 'prompt', label: 'p' })
      .addEdge({ source: 'missing', target: 'n1' })
      .build();
    expect(result.valid).toBe(false);
  });

  it('rejects cycle via edges', () => {
    const result = new DAGBuilder()
      .addNode({ id: 'a', type: 'prompt', label: 'a' })
      .addNode({ id: 'b', type: 'transform', label: 'b' })
      .addNode({ id: 'c', type: 'transform', label: 'c' })
      .addEdge({ source: 'a', target: 'b' })
      .addEdge({ source: 'b', target: 'c' })
      .addEdge({ source: 'c', target: 'a' })
      .build();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cycle'))).toBe(true);
  });

  it('rejects cycle via dependencies', () => {
    const result = new DAGBuilder()
      .addNode({ id: 'a', type: 'prompt', label: 'a', dependencies: ['b'] })
      .addNode({ id: 'b', type: 'prompt', label: 'b', dependencies: ['a'] })
      .build();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('cycle'))).toBe(true);
  });

  it('returns frozen graph on success', () => {
    const result = new DAGBuilder()
      .addNode({ id: 'n1', type: 'prompt', label: 'p' })
      .build();
    expect(Object.isFrozen(result.graph)).toBe(true);
    expect(Object.isFrozen(result.errors)).toBe(true);
  });
});

describe('CycleDetector', () => {
  it('detects no cycles in a DAG', () => {
    const n1 = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const n2 = createExecutionNode({ id: 'b', type: 'transform', label: 'b', dependencies: ['a'] });
    const n3 = createExecutionNode({ id: 'c', type: 'transform', label: 'c', dependencies: ['b'] });
    const graph = createExecutionGraph({
      nodes: [n1, n2, n3],
      edges: [createExecutionEdge({ source: 'a', target: 'b' }), createExecutionEdge({ source: 'b', target: 'c' })],
    });
    expect(detectCycles(graph).hasCycle).toBe(false);
  });

  it('detects a simple cycle', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a', dependencies: ['b'] });
    const b = createExecutionNode({ id: 'b', type: 'prompt', label: 'b', dependencies: ['a'] });
    const graph = createExecutionGraph({ nodes: [a, b], edges: [createExecutionEdge({ source: 'a', target: 'b' }), createExecutionEdge({ source: 'b', target: 'a' })] });
    expect(detectCycles(graph).hasCycle).toBe(true);
  });

  it('detects a self-loop via dependency', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a', dependencies: ['a'] });
    const graph = createExecutionGraph({ nodes: [a] });
    expect(detectCycles(graph).hasCycle).toBe(true);
  });

  it('returns empty cycles array for valid DAG', () => {
    const n1 = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const graph = createExecutionGraph({ nodes: [n1] });
    expect(detectCycles(graph).cycles).toEqual([]);
  });
});

describe('TopologicalSort', () => {
  it('returns canonical ordering', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'transform', label: 'b', dependencies: ['a'] });
    const c = createExecutionNode({ id: 'c', type: 'transform', label: 'c', dependencies: ['b'] });
    const graph = createExecutionGraph({
      nodes: [c, b, a],
      edges: [createExecutionEdge({ source: 'a', target: 'b' }), createExecutionEdge({ source: 'b', target: 'c' })],
    });
    const order = topologicalSort(graph);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('is deterministic (10 runs)', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'prompt', label: 'b', dependencies: ['a'] });
    const graph = createExecutionGraph({ nodes: [b, a] });
    const first = topologicalSort(graph);
    for (let i = 0; i < 10; i++) {
      expect(topologicalSort(graph)).toEqual(first);
    }
  });

  it('handles disconnected subgraphs', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'prompt', label: 'b' });
    const graph = createExecutionGraph({ nodes: [b, a] });
    const order = topologicalSort(graph);
    expect(order).toContain('a');
    expect(order).toContain('b');
  });

  it('returns frozen array', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const graph = createExecutionGraph({ nodes: [a] });
    expect(Object.isFrozen(topologicalSort(graph))).toBe(true);
  });
});

describe('TopologicalSortWithLevels', () => {
  it('groups nodes by depth', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'transform', label: 'b', dependencies: ['a'] });
    const c = createExecutionNode({ id: 'c', type: 'transform', label: 'c', dependencies: ['a'] });
    const d = createExecutionNode({ id: 'd', type: 'transform', label: 'd', dependencies: ['b', 'c'] });
    const graph = createExecutionGraph({
      nodes: [a, b, c, d],
      edges: [createExecutionEdge({ source: 'a', target: 'b' }), createExecutionEdge({ source: 'a', target: 'c' }), createExecutionEdge({ source: 'b', target: 'd' }), createExecutionEdge({ source: 'c', target: 'd' })],
    });
    const groups = topologicalSortWithLevels(graph);
    expect(groups[0]?.nodeIds).toContain('a');
    expect(groups[1]?.nodeIds).toContain('b');
    expect(groups[1]?.nodeIds).toContain('c');
    expect(groups[2]?.nodeIds).toContain('d');
  });
});

describe('DependencyResolver', () => {
  function makeGraph() {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'transform', label: 'b', dependencies: ['a'] });
    const c = createExecutionNode({ id: 'c', type: 'transform', label: 'c', dependencies: ['a'] });
    const d = createExecutionNode({ id: 'd', type: 'transform', label: 'd', dependencies: ['b', 'c'] });
    return createExecutionGraph({ nodes: [a, b, c, d] });
  }

  function states(overrides: Record<string, ExecutionState>): Readonly<Record<string, ExecutionState>> {
    return Object.freeze({
      a: 'pending' as ExecutionState,
      b: 'pending' as ExecutionState,
      c: 'pending' as ExecutionState,
      d: 'pending' as ExecutionState,
      ...overrides,
    });
  }

  it('returns only root nodes as ready initially', () => {
    const graph = makeGraph();
    const ready = getReadyNodes(graph, states({}));
    expect(ready).toEqual(['a']);
  });

  it('returns next level when dependencies complete', () => {
    const graph = makeGraph();
    const ready = getReadyNodes(graph, states({ a: 'completed' }));
    expect(ready).toEqual(['b', 'c']);
  });

  it('returns blocked when dependencies not met', () => {
    const graph = makeGraph();
    const blocked = getBlockedNodes(graph, states({ a: 'running' }));
    expect(blocked).toEqual(['b', 'c', 'd']);
  });

  it('returns all nodes completed when done', () => {
    const graph = makeGraph();
    const frontier = getExecutionFrontier(graph, states({ a: 'completed', b: 'completed', c: 'completed', d: 'completed' }));
    expect(frontier.allDone).toBe(true);
    expect(frontier.ready).toEqual([]);
  });

  it('frontier includes completed and failed lists', () => {
    const graph = makeGraph();
    const frontier = getExecutionFrontier(graph, states({ a: 'completed', b: 'failed' }));
    expect(frontier.completed).toContain('a');
    expect(frontier.failed).toContain('b');
  });

  it('considers edges as dependencies', () => {
    const a = createExecutionNode({ id: 'a', type: 'prompt', label: 'a' });
    const b = createExecutionNode({ id: 'b', type: 'prompt', label: 'b' });
    const graph = createExecutionGraph({
      nodes: [a, b],
      edges: [createExecutionEdge({ source: 'a', target: 'b' })],
    });
    expect(getReadyNodes(graph, states({}))).toEqual(['a']);
    expect(getReadyNodes(graph, states({ a: 'completed' }))).toContain('b');
  });

  it('returns frozen arrays', () => {
    const graph = makeGraph();
    const ready = getReadyNodes(graph, states({}));
    expect(Object.isFrozen(ready)).toBe(true);
  });
});
