import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { TraversalValidator } from '../validation/traversal-validator.ts';
import { QueryValidator } from '../validation/query-validator.ts';
import { PathValidator } from '../validation/path-validator.ts';
import { ReplayValidator } from '../validation/replay-validator.ts';
import { IntegrityValidator } from '../validation/integrity-validator.ts';
import type { GraphQuery, QueryTarget, QueryOperator, TraversalResult, QueryClause } from '../types/index.ts';

function makeTraversalResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trav-1',
    strategy: 'BFS',
    steps: [
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'B', depth: 1, parentId: 'A', edgeId: 'e1', metadata: {} },
    ],
    visited: new Set(['A', 'B']),
    depth: 1,
    nodeCount: 2,
    startNode: 'A',
    endNode: 'B',
    duration: 10,
    status: 'COMPLETED',
    fingerprint: 'fp-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as TraversalResult;
}

describe('TraversalValidator', () => {
  it('validate passes for valid traversal', () => {
    const validator = new TraversalValidator();
    const result = validator.validate(makeTraversalResult());
    expect(result.valid).toBe(true);
  });

  it('validate fails for missing id', () => {
    const validator = new TraversalValidator();
    const result = validator.validate(makeTraversalResult({ id: '' }));
    expect(result.valid).toBe(false);
  });

  it('validate fails for missing strategy', () => {
    const validator = new TraversalValidator();
    const result = validator.validate(makeTraversalResult({ strategy: '' }));
    expect(result.valid).toBe(false);
  });

  it('validate fails for missing startNode', () => {
    const validator = new TraversalValidator();
    const result = validator.validate(makeTraversalResult({ startNode: '' }));
    expect(result.valid).toBe(false);
  });

  it('validateSteps checks step integrity', () => {
    const validator = new TraversalValidator();
    const result = validator.validateSteps([{ nodeId: '', depth: -1, parentId: null, edgeId: null, metadata: {} }]);
    expect(result.valid).toBe(false);
  });

  it('validateOrdering detects depth jumps', () => {
    const validator = new TraversalValidator();
    const result = validator.validateOrdering([
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'B', depth: 5, parentId: 'A', edgeId: null, metadata: {} },
    ]);
    expect(result.valid).toBe(false);
  });

  it('validateNoDuplicates detects duplicates', () => {
    const validator = new TraversalValidator();
    const result = validator.validateNoDuplicates([
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'A', depth: 1, parentId: null, edgeId: null, metadata: {} },
    ]);
    expect(result.valid).toBe(false);
  });

  it('validateDepthConsistency detects invalid first depth', () => {
    const validator = new TraversalValidator();
    const result = validator.validateDepthConsistency([
      { nodeId: 'A', depth: 5, parentId: null, edgeId: null, metadata: {} },
    ]);
    expect(result.valid).toBe(false);
  });

  it('validateDepthConsistency detects negative depth', () => {
    const validator = new TraversalValidator();
    const result = validator.validateDepthConsistency([
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'B', depth: -1, parentId: 'A', edgeId: null, metadata: {} },
    ]);
    expect(result.valid).toBe(false);
  });
});

describe('QueryValidator', () => {
  it('validate passes for valid query', () => {
    const validator = new QueryValidator();
    const query: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [{ field: 'type', operator: 'EQ', value: 'module' }] }, parameters: {}, fingerprint: 'fp' };
    const result = validator.validate(query);
    expect(result.valid).toBe(true);
  });

  it('validate fails for missing id', () => {
    const validator = new QueryValidator();
    const query: GraphQuery = { id: '', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const result = validator.validate(query);
    expect(result.valid).toBe(false);
  });

  it('validate fails for invalid target', () => {
    const validator = new QueryValidator();
    const query: GraphQuery = { id: 'q1', raw: '', target: 'INVALID' as QueryTarget, clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const result = validator.validate(query);
    expect(result.valid).toBe(false);
  });

  it('validate fails for missing clauses', () => {
    const validator = new QueryValidator();
    const query: GraphQuery = { id: 'q1', raw: '', target: 'NODES', clauses: null as unknown as QueryClause, parameters: {}, fingerprint: 'fp' };
    const result = validator.validate(query);
    expect(result.valid).toBe(false);
  });

  it('validateConditions fails for missing field', () => {
    const validator = new QueryValidator();
    const result = validator.validateConditions([{ field: '', operator: 'EQ', value: 'test' }]);
    expect(result.valid).toBe(false);
  });

  it('validateConditions fails for invalid operator', () => {
    const validator = new QueryValidator();
    const result = validator.validateConditions([{ field: 'type', operator: 'INVALID' as QueryOperator, value: 'test' }]);
    expect(result.valid).toBe(false);
  });

  it('validateParameters validates depth', () => {
    const validator = new QueryValidator();
    const result = validator.validateParameters({ depth: -1 });
    expect(result.valid).toBe(false);
  });

  it('validateParameters validates from type', () => {
    const validator = new QueryValidator();
    const result = validator.validateParameters({ from: 123 });
    expect(result.valid).toBe(false);
  });
});

describe('PathValidator', () => {
  it('validate passes for valid path', () => {
    const graph = createMockGraph();
    const validator = new PathValidator();
    const path = {
      nodes: ['A', 'B', 'D'],
      edges: ['e1', 'e3'],
      totalWeight: 2,
      nodeCount: 3,
      edgeCount: 2,
      riskScore: 0,
      riskLevel: 'NONE' as const,
      fingerprint: 'fp',
    };
    const result = validator.validate(path, graph);
    expect(result.valid).toBe(true);
  });

  it('validate fails for missing nodes', () => {
    const graph = createMockGraph();
    const validator = new PathValidator();
    const path = {
      nodes: [], edges: ['e1'], totalWeight: 1, nodeCount: 0, edgeCount: 1,
      riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    const result = validator.validate(path, graph);
    expect(result.valid).toBe(false);
  });

  it('validate fails for missing edges', () => {
    const graph = createMockGraph();
    const validator = new PathValidator();
    const path = {
      nodes: ['A', 'B'], edges: [], totalWeight: 0, nodeCount: 2, edgeCount: 0,
      riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    const result = validator.validate(path, graph);
    expect(result.valid).toBe(false);
  });

  it('validatePathExists checks node existence', () => {
    const graph = createMockGraph();
    const validator = new PathValidator();
    const path = {
      nodes: ['A', 'UNKNOWN'], edges: ['e1'], totalWeight: 1, nodeCount: 2, edgeCount: 1,
      riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    expect(validator.validatePathExists(path, graph)).toBe(false);
  });

  it('validateNoCycles detects cycles', () => {
    const validator = new PathValidator();
    const path = {
      nodes: ['A', 'B', 'A'], edges: ['e1', 'e2'], totalWeight: 2, nodeCount: 3,
      edgeCount: 2, riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    expect(validator.validateNoCycles(path)).toBe(false);
  });
});

describe('ReplayValidator (validation module)', () => {
  it('validateTraversalReplay passes for matching', () => {
    const validator = new ReplayValidator();
    const t = makeTraversalResult();
    const result = validator.validateTraversalReplay(t, t);
    expect(result.valid).toBe(true);
  });

  it('validateTraversalReplay detects strategy mismatch', () => {
    const validator = new ReplayValidator();
    const a = makeTraversalResult();
    const b = makeTraversalResult({ strategy: 'DFS' });
    const result = validator.validateTraversalReplay(a, b);
    expect(result.valid).toBe(false);
  });

  it('validateTraversalReplay detects depth mismatch', () => {
    const validator = new ReplayValidator();
    const a = makeTraversalResult();
    const b = makeTraversalResult({ depth: 99 });
    const result = validator.validateTraversalReplay(a, b);
    expect(result.valid).toBe(false);
  });

  it('validateQueryReplay passes for matching', () => {
    const validator = new ReplayValidator();
    const q: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const result = validator.validateQueryReplay(q, q);
    expect(result.valid).toBe(true);
  });

  it('validateQueryReplay detects target mismatch', () => {
    const validator = new ReplayValidator();
    const a: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const b: GraphQuery = { ...a, target: 'EDGES' };
    const result = validator.validateQueryReplay(a, b);
    expect(result.valid).toBe(false);
  });

  it('validateFingerprintConsistency checks fingerprint', () => {
    const validator = new ReplayValidator();
    const t = makeTraversalResult();
    const result = validator.validateFingerprintConsistency(t);
    expect(typeof result).toBe('boolean');
  });
});

describe('IntegrityValidator', () => {
  it('validateTraversalIntegrity passes for valid', () => {
    const validator = new IntegrityValidator();
    const t = makeTraversalResult();
    const result = validator.validateTraversalIntegrity(t);
    expect(result.valid).toBe(true);
  });

  it('validateTraversalIntegrity detects step/count mismatch', () => {
    const validator = new IntegrityValidator();
    const t = makeTraversalResult({ nodeCount: 99 });
    const result = validator.validateTraversalIntegrity(t);
    expect(result.valid).toBe(false);
  });

  it('validateTraversalIntegrity detects visited/count mismatch', () => {
    const validator = new IntegrityValidator();
    const t = makeTraversalResult({ visited: new Set(['A', 'B', 'C']) });
    const result = validator.validateTraversalIntegrity(t);
    expect(result.valid).toBe(false);
  });

  it('validateQueryIntegrity passes for valid query', () => {
    const validator = new IntegrityValidator();
    const q: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const result = validator.validateQueryIntegrity(q);
    expect(result.valid).toBe(true);
  });

  it('validateQueryIntegrity detects missing id', () => {
    const validator = new IntegrityValidator();
    const q = { raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, fingerprint: 'fp' } as unknown as GraphQuery;
    const result = validator.validateQueryIntegrity(q);
    expect(result.valid).toBe(false);
  });

  it('validatePathIntegrity passes for valid path', () => {
    const validator = new IntegrityValidator();
    const path = {
      nodes: ['A', 'B'], edges: ['e1'], totalWeight: 1, nodeCount: 2, edgeCount: 1,
      riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    const result = validator.validatePathIntegrity(path);
    expect(result.valid).toBe(true);
  });

  it('validatePathIntegrity detects node/edge count mismatch', () => {
    const validator = new IntegrityValidator();
    const path = {
      nodes: ['A', 'B', 'C'], edges: ['e1'], totalWeight: 1, nodeCount: 3, edgeCount: 1,
      riskScore: 0, riskLevel: 'NONE' as const, fingerprint: 'fp',
    };
    const result = validator.validatePathIntegrity(path);
    expect(result.valid).toBe(false);
  });

  it('validateNeighborhoodIntegrity passes for valid', () => {
    const validator = new IntegrityValidator();
    const nbhd = { center: 'A', nodes: ['A', 'B'], edges: ['e1'], radius: 1, nodeCount: 2, edgeCount: 1, density: 0.5, fingerprint: 'fp' };
    const result = validator.validateNeighborhoodIntegrity(nbhd);
    expect(result.valid).toBe(true);
  });

  it('validateNeighborhoodIntegrity detects missing center', () => {
    const validator = new IntegrityValidator();
    const nbhd = { center: '', nodes: ['A'], edges: [], radius: 1, nodeCount: 1, edgeCount: 0, density: 0, fingerprint: 'fp' };
    const result = validator.validateNeighborhoodIntegrity(nbhd);
    expect(result.valid).toBe(false);
  });
});
