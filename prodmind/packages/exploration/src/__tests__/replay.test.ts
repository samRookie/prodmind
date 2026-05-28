import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { TraversalReplay } from '../replay/traversal-replay.ts';
import { QueryReplay, GraphQueryEngine } from '../replay/query-replay.ts';
import { ReplayValidator } from '../replay/replay-validation.ts';
import { ReplayFingerprint } from '../replay/replay-fingerprint.ts';
import { ReplayDiff } from '../replay/replay-diff.ts';
import { ReplayComparison } from '../replay/replay-comparison.ts';
import type { TraversalResult, GraphQuery } from '../types/index.ts';

function makeTraversalResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trav-1',
    strategy: 'BFS',
    steps: [
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'B', depth: 1, parentId: 'A', edgeId: 'e1', metadata: {} },
      { nodeId: 'D', depth: 2, parentId: 'B', edgeId: 'e3', metadata: {} },
      { nodeId: 'F', depth: 3, parentId: 'D', edgeId: 'e6', metadata: {} },
    ],
    visited: new Set(['A', 'B', 'D', 'F']),
    depth: 3,
    nodeCount: 4,
    startNode: 'A',
    endNode: 'F',
    duration: 10,
    status: 'COMPLETED',
    fingerprint: 'fp-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as TraversalResult;
}

function makeGraphQuery(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q-1',
    raw: 'FIND nodes',
    target: 'NODES',
    clauses: { logic: 'AND', conditions: [] },
    parameters: {},
    fingerprint: 'fp-q1',
    ...overrides,
  } as GraphQuery;
}

describe('TraversalReplay', () => {
  it('replayTraversal replays steps successfully', () => {
    const graph = createMockGraph();
    const traversal = makeTraversalResult();
    const replayed = TraversalReplay.replayTraversal(traversal, graph);
    expect(replayed.strategy).toBe('BFS');
    expect(replayed.steps.length).toBe(4);
  });

  it('replayTraversal throws for missing node', () => {
    const graph = createMockGraph();
    const traversal = makeTraversalResult({
      steps: [
        { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
        { nodeId: 'UNKNOWN', depth: 1, parentId: 'A', edgeId: 'e1', metadata: {} },
      ],
      visited: new Set(['A', 'UNKNOWN']),
    });
    expect(() => TraversalReplay.replayTraversal(traversal, graph)).toThrow();
  });

  it('compareTraversals identifies matching traversals', () => {
    const graph = createMockGraph();
    const traversal = makeTraversalResult();
    const replayed = TraversalReplay.replayTraversal(traversal, graph);
    const result = TraversalReplay.compareTraversals(traversal, replayed);
    expect(result.identical).toBe(true);
  });

  it('compareTraversals detects differences', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult({ strategy: 'DFS' });
    const result = TraversalReplay.compareTraversals(a, b);
    expect(result.identical).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('verifyFingerprint validates fingerprint', () => {
    const traversal = makeTraversalResult();
    const result = TraversalReplay.verifyFingerprint(traversal);
    expect(typeof result).toBe('boolean');
  });
});

describe('QueryReplay', () => {
  it('replayQuery executes query', () => {
    const graph = createMockGraph();
    const engine = new GraphQueryEngine(graph);
    const replay = new QueryReplay(engine);
    const query = makeGraphQuery();
    const result = replay.replayQuery(query);
    expect(result.result).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('compareQueryResults detects differences', () => {
    const replay = new QueryReplay(new GraphQueryEngine(createMockGraph()));
    const result = replay.compareQueryResults({ a: 1 }, { a: 2 });
    expect(result.identical).toBe(false);
  });

  it('compareQueryReports identical for same results', () => {
    const replay = new QueryReplay(new GraphQueryEngine(createMockGraph()));
    const result = replay.compareQueryResults({ a: 1 }, { a: 1 });
    expect(result.identical).toBe(true);
  });

  it('verifyQueryFingerprint validates', () => {
    const replay = new QueryReplay(new GraphQueryEngine(createMockGraph()));
    const result = replay.verifyQueryFingerprint(makeGraphQuery());
    expect(typeof result).toBe('boolean');
  });
});

describe('ReplayValidator', () => {
  it('validateTraversal passes for matching traversals', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult();
    expect(new ReplayValidator().validateTraversal(a, b)).toBe(true);
  });

  it('validateTraversal throws for different strategies', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult({ strategy: 'DFS' });
    expect(() => new ReplayValidator().validateTraversal(a, b)).toThrow();
  });

  it('validateTraversal throws for different lengths', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult({ steps: a.steps.slice(0, 2) });
    expect(() => new ReplayValidator().validateTraversal(a, b)).toThrow();
  });

  it('validateQuery passes for matching queries', () => {
    const a = makeGraphQuery();
    const b = makeGraphQuery();
    expect(new ReplayValidator().validateQuery(a, b)).toBe(true);
  });

  it('validateQuery throws for different targets', () => {
    const a = makeGraphQuery();
    const b = makeGraphQuery({ target: 'EDGES' });
    expect(() => new ReplayValidator().validateQuery(a, b)).toThrow();
  });

  it('validateTraversalSteps passes for matching steps', () => {
    const steps = [
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
    ];
    expect(new ReplayValidator().validateTraversalSteps(steps, steps)).toBe(true);
  });

  it('validateTraversalSteps throws for different steps', () => {
    const a = [{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    const b = [{ nodeId: 'B', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    expect(() => new ReplayValidator().validateTraversalSteps(a, b)).toThrow();
  });

  it('validateOrdering passes for identical ordering', () => {
    expect(new ReplayValidator().validateOrdering(['A', 'B'], ['A', 'B'])).toBe(true);
  });

  it('validateOrdering throws for different ordering', () => {
    expect(() => new ReplayValidator().validateOrdering(['A', 'B'], ['B', 'A'])).toThrow();
  });
});

describe('ReplayFingerprint', () => {
  it('fromTraversal returns fingerprint', () => {
    const fp = ReplayFingerprint.fromTraversal(makeTraversalResult());
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });

  it('fromQuery returns fingerprint', () => {
    const fp = ReplayFingerprint.fromQuery(makeGraphQuery());
    expect(typeof fp).toBe('string');
  });

  it('compare returns true for equal', () => {
    expect(ReplayFingerprint.compare('a', 'a')).toBe(true);
    expect(ReplayFingerprint.compare('a', 'b')).toBe(false);
  });

  it('verifyReplayChain validates chain', () => {
    expect(ReplayFingerprint.verifyReplayChain(['a', 'a', 'a'])).toBe(true);
    expect(ReplayFingerprint.verifyReplayChain(['a', 'b', 'a'])).toBe(false);
  });

  it('verifyReplayChain returns true for single', () => {
    expect(ReplayFingerprint.verifyReplayChain(['a'])).toBe(true);
  });
});

describe('ReplayDiff', () => {
  it('diffTraversals detects added/removed', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult({
      steps: [...a.steps, { nodeId: 'G', depth: 4, parentId: 'F', edgeId: 'e7', metadata: {} }],
      visited: new Set([...a.visited, 'G']),
    });
    const diff = ReplayDiff.diffTraversals(a, b);
    expect(diff.added).toContain('G');
  });

  it('diffNodeOrders detects changes', () => {
    const diff = ReplayDiff.diffNodeOrders(['A', 'B', 'C'], ['A', 'C', 'B']);
    expect(diff.reordered).toBe(true);
  });

  it('diffNodeOrders detects added nodes', () => {
    const diff = ReplayDiff.diffNodeOrders(['A', 'B'], ['A', 'B', 'C']);
    expect(diff.added).toContain('C');
  });

  it('diffNodeOrders detects removed nodes', () => {
    const diff = ReplayDiff.diffNodeOrders(['A', 'B', 'C'], ['A', 'B']);
    expect(diff.removed).toContain('C');
  });

  it('diffTraversals detects reordered', () => {
    const a = makeTraversalResult();
    const b = makeTraversalResult({
      steps: [...a.steps].reverse(),
    });
    const diff = ReplayDiff.diffTraversals(a, b);
    expect(diff.reordered).toBe(true);
  });
});

describe('ReplayComparison', () => {
  it('compareTraversalSets compares maps', () => {
    const baseline = new Map([['key1', makeTraversalResult()]]);
    const candidate = new Map([['key1', makeTraversalResult()]]);
    const results = ReplayComparison.compareTraversalSets(baseline, candidate);
    expect(results.length).toBeGreaterThan(0);
  });

  it('compareTraversalSets detects missing keys', () => {
    const baseline = new Map([['key1', makeTraversalResult()]]);
    const candidate = new Map();
    const results = ReplayComparison.compareTraversalSets(baseline, candidate);
    expect(results[0]!.identical).toBe(false);
  });

  it('compareQuerySets compares query maps', () => {
    const baseline = new Map([['q1', makeGraphQuery()]]);
    const candidate = new Map([['q1', makeGraphQuery()]]);
    const results = ReplayComparison.compareQuerySets(baseline, candidate);
    expect(results.length).toBeGreaterThan(0);
  });

  it('summarizeResults returns stats', () => {
    const summary = ReplayComparison.summarizeResults([
      { key: 'a', identical: true },
      { key: 'b', identical: false },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.identical).toBe(1);
    expect(summary.matchRate).toBe(0.5);
  });
});
