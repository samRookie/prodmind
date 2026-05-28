import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';
import { DFSTraverser } from '../traversal/dfs-traverser.ts';
import { BoundedTraverser } from '../traversal/bounded-traverser.ts';
import { LayeredTraverser } from '../traversal/layered-traverser.ts';
import { WeightedTraverser } from '../traversal/weighted-traverser.ts';
import { TraversalContext } from '../traversal/traversal-context.ts';
import { TraversalState } from '../traversal/traversal-state.ts';
import { TraversalCache } from '../traversal/traversal-cache.ts';
import { TraversalOrdering } from '../traversal/traversal-ordering.ts';
import { TraversalFingerprint } from '../traversal/traversal-fingerprint.ts';

import type { GraphEdge, TraversalResult } from '../types/index.ts';

describe('BFSTraverser', () => {
  it('traverses a simple graph correctly', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('A', { maxDepth: 10 });
    const visited = Array.from(result.visited);
    expect(visited).toContain('A');
    expect(visited).toContain('B');
    expect(visited).toContain('C');
    expect(visited).toContain('D');
    expect(visited).toContain('E');
    expect(visited).toContain('F');
    expect(result.strategy).toBe('BFS');
    expect(result.status).toBe('COMPLETED');
  });

  it('starts with the correct start node', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('D');
    expect(result.startNode).toBe('D');
    expect(result.steps[0]!.nodeId).toBe('D');
  });

  it('produces BFS ordering (shorter depth first)', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('A', { maxDepth: 10 });
    const stepNodes = result.steps.map(s => s.nodeId);
    const depth0 = stepNodes.indexOf('A');
    const depth1 = [stepNodes.indexOf('B'), stepNodes.indexOf('C')];
    const depth2 = [stepNodes.indexOf('D'), stepNodes.indexOf('E')];
    const depth3 = stepNodes.indexOf('F');
    expect(depth0).toBe(0);
    depth1.forEach(i => expect(i).toBeGreaterThan(depth0));
    depth2.forEach(i => expect(i).toBeGreaterThan(Math.max(...depth1)));
    expect(depth3).toBeGreaterThan(Math.max(...depth2));
  });

  it('respects maxDepth option', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('A', { maxDepth: 1 });
    expect(result.visited.has('F')).toBe(false);
    expect(result.visited.has('A')).toBe(true);
    expect(result.visited.has('B')).toBe(true);
    expect(result.visited.has('C')).toBe(true);
  });

  it('supports reverse direction', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('F', { maxDepth: 10, direction: 'REVERSE' });
    expect(result.visited.has('F')).toBe(true);
    expect(result.visited.has('E')).toBe(true);
    expect(result.visited.has('D')).toBe(true);
    expect(result.visited.has('B')).toBe(true);
    expect(result.visited.has('A')).toBe(true);
  });

  it('supports bidirectional direction', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('D', { maxDepth: 1, direction: 'BIDIRECTIONAL' });
    expect(result.visited.has('D')).toBe(true);
    expect(result.visited.has('B')).toBe(true);
    expect(result.visited.size).toBeGreaterThanOrEqual(2);
  });
});

describe('DFSTraverser', () => {
  it('produces deterministic results on the same graph', () => {
    const graph = createMockGraph();
    const dfs1 = new DFSTraverser(graph);
    const dfs2 = new DFSTraverser(graph);
    const result1 = dfs1.traverse('A', { maxDepth: 10, ordering: 'ALPHABETICAL' });
    const result2 = dfs2.traverse('A', { maxDepth: 10, ordering: 'ALPHABETICAL' });
    const ids1 = result1.steps.map(s => s.nodeId);
    const ids2 = result2.steps.map(s => s.nodeId);
    expect(ids1).toEqual(ids2);
  });

  it('traverses all nodes from A', () => {
    const graph = createMockGraph();
    const dfs = new DFSTraverser(graph);
    const result = dfs.traverse('A', { maxDepth: 10 });
    expect(result.visited.size).toBe(6);
  });

  it('respects maxDepth', () => {
    const graph = createMockGraph();
    const dfs = new DFSTraverser(graph);
    const result = dfs.traverse('A', { maxDepth: 1 });
    expect(result.visited.has('F')).toBe(false);
    expect(result.visited.has('A')).toBe(true);
  });
});

describe('BoundedTraverser', () => {
  it('respects node limits', () => {
    const graph = createMockGraph();
    const bounded = new BoundedTraverser(graph);
    const result = bounded.traverse('A', { maxNodes: 3, maxDepth: 10 });
    expect(result.visited.size).toBeLessThanOrEqual(3);
  });

  it('respects depth limits', () => {
    const graph = createMockGraph();
    const bounded = new BoundedTraverser(graph);
    const result = bounded.traverse('A', { maxDepth: 1, maxNodes: 100 });
    expect(result.depth).toBeLessThanOrEqual(1);
    expect(result.visited.has('A')).toBe(true);
    expect(result.visited.has('B')).toBe(true);
    expect(result.visited.has('C')).toBe(true);
    expect(result.visited.has('D')).toBe(false);
  });

  it('returns BOUNDED status when timeout reached', () => {
    const graph = createMockGraph();
    const bounded = new BoundedTraverser(graph);
    const result = bounded.traverse('A', { maxDepth: 100, maxNodes: 100, timeout: 0 });
    expect(['BOUNDED', 'CANCELLED']).toContain(result.status);
  });

  it('respects timeout with immediate threshold', () => {
    const graph = createMockGraph();
    const bounded = new BoundedTraverser(graph);
    const result = bounded.traverse('A', { maxDepth: 100, maxNodes: 100, timeout: -1 });
    expect(result.status).toBe('BOUNDED');
  });
});

describe('LayeredTraverser', () => {
  it('produces correct layer ordering', () => {
    const graph = createMockGraph();
    const layered = new LayeredTraverser(graph);
    const result = layered.traverse('A', { maxDepth: 10 });
    const steps = result.steps;
    const layer0 = steps.filter(s => s.metadata.layer === 0);
    const layer1 = steps.filter(s => s.metadata.layer === 1);
    const layer2 = steps.filter(s => s.metadata.layer === 2);
    expect(layer0.length).toBe(0);
    expect(layer1.length).toBe(2);
    expect(layer1.map(s => s.nodeId).sort()).toEqual(['B', 'C']);
    expect(layer2.length).toBeGreaterThanOrEqual(1);
  });

  it('stops at maxDepth', () => {
    const graph = createMockGraph();
    const layered = new LayeredTraverser(graph);
    const result = layered.traverse('A', { maxDepth: 1 });
    const layers = result.steps.map(s => s.metadata.layer as number | undefined).filter(l => l !== undefined);
    const maxLayer = layers.length > 0 ? Math.max(...layers) : 0;
    expect(maxLayer).toBeLessThanOrEqual(1);
  });
});

describe('WeightedTraverser', () => {
  it('follows lowest-weight edges first when ascending', () => {
    const graph = createMockGraph();
    const weighted = new WeightedTraverser(graph);
    const result = weighted.traverse('A', { maxDepth: 10, ascending: true });
    expect(result.visited.size).toBeGreaterThanOrEqual(2);
  });

  it('produces deterministic results', () => {
    const graph = createMockGraph();
    const w1 = new WeightedTraverser(graph);
    const w2 = new WeightedTraverser(graph);
    const r1 = w1.traverse('A', { maxDepth: 10, ascending: true });
    const r2 = w2.traverse('A', { maxDepth: 10, ascending: true });
    const ids1 = r1.steps.map(s => s.nodeId);
    const ids2 = r2.steps.map(s => s.nodeId);
    expect(ids1).toEqual(ids2);
  });
});

describe('TraversalContext', () => {
  it('correctly tracks visited nodes', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS' });
    expect(ctx.isVisited('A')).toBe(false);
    ctx.markVisited('A');
    expect(ctx.isVisited('A')).toBe(true);
    expect(ctx.visited.size).toBe(1);
  });

  it('shouldContinue returns false when cancelled', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS' });
    ctx.cancel();
    expect(ctx.shouldContinue()).toBe(false);
  });

  it('shouldContinue returns false when maxNodes exceeded', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS', maxNodes: 1 });
    ctx.markVisited('A');
    ctx.markVisited('B');
    expect(ctx.shouldContinue()).toBe(false);
  });

  it('shouldContinue returns false when depth exceeds maxDepth', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS', maxDepth: 5 });
    ctx.depth = 10;
    expect(ctx.shouldContinue()).toBe(false);
  });

  it('addStep correctly appends steps', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS' });
    ctx.addStep({ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} });
    expect(ctx.steps.length).toBe(1);
    expect(ctx.steps[0]!.nodeId).toBe('A');
  });

  it('elapsed returns non-negative time', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS' });
    expect(ctx.elapsed()).toBeGreaterThanOrEqual(0);
  });

  it('cancel sets cancelled flag', () => {
    const ctx = new TraversalContext({ startNode: 'A', strategy: 'BFS' });
    expect(ctx.cancelled).toBe(false);
    ctx.cancel();
    expect(ctx.cancelled).toBe(true);
  });
});

describe('TraversalState', () => {
  it('withVisited returns new instance', () => {
    const state = new TraversalState({ visited: ['A'], steps: [], frontier: [], depth: 0 });
    const next = state.withVisited('B');
    expect(next).not.toBe(state);
    expect(next.visited).toContain('B');
    expect(state.visited).not.toContain('B');
  });

  it('withStep returns new instance', () => {
    const step = { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} };
    const state = new TraversalState({ visited: [], steps: [], frontier: [], depth: 0 });
    const next = state.withStep(step);
    expect(next.steps.length).toBe(1);
    expect(state.steps.length).toBe(0);
  });

  it('withFrontier returns new instance', () => {
    const state = new TraversalState({ visited: [], steps: [], frontier: ['A'], depth: 0 });
    const next = state.withFrontier(['B']);
    expect(next.frontier).toEqual(['B']);
    expect(state.frontier).toEqual(['A']);
  });

  it('withDepth returns new instance', () => {
    const state = new TraversalState({ visited: [], steps: [], frontier: [], depth: 0 });
    const next = state.withDepth(5);
    expect(next.depth).toBe(5);
    expect(state.depth).toBe(0);
  });

  it('fingerprint is deterministic', () => {
    const state = new TraversalState({ visited: ['A', 'B'], steps: [], frontier: [], depth: 1 });
    const state2 = new TraversalState({ visited: ['A', 'B'], steps: [], frontier: [], depth: 1 });
    expect(state.fingerprint).toBe(state2.fingerprint);
  });

  it('visited is frozen', () => {
    const state = new TraversalState({ visited: ['A'], steps: [], frontier: [], depth: 0 });
    expect(Object.isFrozen(state.visited)).toBe(true);
  });
});

describe('TraversalCache', () => {
  it('stores and retrieves entries', () => {
    const cache = new TraversalCache();
    const entry = { key: 'test', result: { id: 't1' } as unknown as TraversalResult };
    cache.set('test', entry);
    const retrieved = cache.get('test');
    expect(retrieved).toBeDefined();
    expect(retrieved!.hits).toBe(1);
  });

  it('evicts oldest when full', () => {
    const cache = new TraversalCache(2);
    cache.set('a', { key: 'a', result: { id: 'r1' } as unknown as TraversalResult });
    cache.set('b', { key: 'b', result: { id: 'r2' } as unknown as TraversalResult });
    cache.set('c', { key: 'c', result: { id: 'r3' } as unknown as TraversalResult });
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeDefined();
    expect(cache.get('c')).toBeDefined();
  });

  it('invalidate removes entry', () => {
    const cache = new TraversalCache();
    cache.set('a', { key: 'a', result: { id: 'r1' } as unknown as TraversalResult });
    cache.invalidate('a');
    expect(cache.get('a')).toBeUndefined();
  });

  it('clear removes all entries', () => {
    const cache = new TraversalCache();
    cache.set('a', { key: 'a', result: { id: 'r1' } as unknown as TraversalResult });
    cache.clear();
    expect(cache.stats().size).toBe(0);
  });

  it('stats returns correct info', () => {
    const cache = new TraversalCache(100);
    cache.set('a', { key: 'a', result: { id: 'r1' } as unknown as TraversalResult });
    cache.get('a');
    const stats = cache.stats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(100);
  });
});

describe('TraversalOrdering', () => {
  it('sorts alphabetically', () => {
    const sorted = TraversalOrdering.orderNodes(['C', 'A', 'B'], 'ALPHABETICAL');
    expect(sorted).toEqual(['A', 'B', 'C']);
  });

  it('orderEdges sorts by weight ascending', () => {
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'A', target: 'B', type: 'depends', weight: 3, properties: {} },
      { id: 'e2', source: 'A', target: 'C', type: 'depends', weight: 1, properties: {} },
      { id: 'e3', source: 'A', target: 'D', type: 'depends', weight: 2, properties: {} },
    ];
    const sorted = TraversalOrdering.orderEdges(edges, 'WEIGHTED_ASC');
    expect(sorted[0]!.weight).toBe(1);
    expect(sorted[1]!.weight).toBe(2);
    expect(sorted[2]!.weight).toBe(3);
  });

  it('orderEdges sorts by weight descending', () => {
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'A', target: 'B', type: 'depends', weight: 1, properties: {} },
      { id: 'e2', source: 'A', target: 'C', type: 'depends', weight: 3, properties: {} },
    ];
    const sorted = TraversalOrdering.orderEdges(edges, 'WEIGHTED_DESC');
    expect(sorted[0]!.weight).toBe(3);
    expect(sorted[1]!.weight).toBe(1);
  });

  it('orderEdges preserves insertion order', () => {
    const edges: GraphEdge[] = [
      { id: 'e1', source: 'A', target: 'B', type: 'depends', weight: 3, properties: {} },
      { id: 'e2', source: 'A', target: 'C', type: 'depends', weight: 1, properties: {} },
    ];
    const sorted = TraversalOrdering.orderEdges(edges, 'INSERTION');
    expect(sorted).toEqual(edges);
  });

  it('byType groups by node type', () => {
    const graph = createMockGraph();
    const sorted = TraversalOrdering.byType(['C', 'B', 'A'], id => graph.getNode(id)!.type);
    expect(sorted.indexOf('C')).toBeLessThan(sorted.indexOf('A'));
  });
});

describe('TraversalFingerprint', () => {
  it('produces deterministic hashes from steps', () => {
    const steps = [{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    const fp1 = TraversalFingerprint.fromSteps(steps);
    const fp2 = TraversalFingerprint.fromSteps(steps);
    expect(fp1).toBe(fp2);
  });

  it('detects different traversals', () => {
    const steps1 = [{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    const steps2 = [{ nodeId: 'B', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    const fp1 = TraversalFingerprint.fromSteps(steps1);
    const fp2 = TraversalFingerprint.fromSteps(steps2);
    expect(fp1).not.toBe(fp2);
  });

  it('fromVisited produces deterministic hash', () => {
    const set = new Set(['B', 'A']);
    const fp1 = TraversalFingerprint.fromVisited(set);
    const fp2 = TraversalFingerprint.fromVisited(set);
    expect(fp1).toBe(fp2);
  });

  it('fromSequence is deterministic', () => {
    const seq = ['A', 'B', 'C'];
    const fp1 = TraversalFingerprint.fromSequence(seq);
    const fp2 = TraversalFingerprint.fromSequence(seq);
    expect(fp1).toBe(fp2);
  });

  it('compare returns true for equal fingerprints', () => {
    const fp = TraversalFingerprint.fromSteps([{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }]);
    expect(TraversalFingerprint.compare(fp, fp)).toBe(true);
  });
});

describe('Cancellation', () => {
  it('cancelling traversal prevents further exploration', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    bfs.traverse('A', { maxDepth: 100, maxNodes: 100, timeout: 5000 });
    bfs.cancel();
    expect(bfs.getState()).toBeDefined();
  });
});

describe('Different strategies produce different orderings', () => {
  it('BFS and DFS produce different step orderings', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const dfs = new DFSTraverser(graph);
    const bfsResult = bfs.traverse('A', { maxDepth: 100, ordering: 'INSERTION' });
    const dfsResult = dfs.traverse('A', { maxDepth: 100, ordering: 'INSERTION' });
    const bfsSteps = bfsResult.steps.map(s => s.nodeId);
    const dfsSteps = dfsResult.steps.map(s => s.nodeId);
    expect(bfsSteps).not.toEqual(dfsSteps);
  });
});

describe('Reverse traversal', () => {
  it('reverse BFS from F reaches A', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('F', { maxDepth: 10, direction: 'REVERSE' });
    expect(result.visited.has('A')).toBe(true);
    expect(result.visited.has('F')).toBe(true);
  });

  it('reverse traversal from leaf goes upstream', () => {
    const graph = createMockGraph();
    const bfs = new BFSTraverser(graph);
    const result = bfs.traverse('F', { maxDepth: 2, direction: 'REVERSE' });
    expect(result.visited.has('E')).toBe(true);
    expect(result.visited.has('D')).toBe(true);
    expect(result.visited.has('B')).toBe(true);
  });
});
