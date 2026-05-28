import { describe, it, expect } from 'vitest';

import { TraversalSerializer } from '../serialization/traversal-serializer.ts';
import { QuerySerializer } from '../serialization/query-serializer.ts';
import { PathSerializer } from '../serialization/path-serializer.ts';
import { NeighborhoodSerializer } from '../serialization/neighborhood-serializer.ts';
import { Canonicalization } from '../serialization/canonicalization.ts';
import { SerializationError } from '../errors/index.ts';
import type { GraphQuery, TraversalResult } from '../types/index.ts';

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

describe('TraversalSerializer', () => {
  it('serialize produces JSON string', () => {
    const serializer = new TraversalSerializer();
    const traversal = makeTraversalResult();
    const json = serializer.serialize(traversal);
    expect(typeof json).toBe('string');
    expect(JSON.parse(json)).toHaveProperty('id');
  });

  it('serializePretty produces indented JSON', () => {
    const serializer = new TraversalSerializer();
    const traversal = makeTraversalResult();
    const json = serializer.serializePretty(traversal);
    expect(json).toContain('\n');
  });

  it('deserialize restores traversal', () => {
    const serializer = new TraversalSerializer();
    const traversal = makeTraversalResult();
    const json = serializer.serialize(traversal);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.id).toBe(traversal.id);
    expect(deserialized.strategy).toBe(traversal.strategy);
    expect(deserialized.steps.length).toBe(traversal.steps.length);
    expect(deserialized.visited.size).toBe(traversal.visited.size);
  });

  it('deserialize throws for invalid JSON', () => {
    const serializer = new TraversalSerializer();
    expect(() => serializer.deserialize('invalid')).toThrow(SerializationError);
  });

  it('serializeSteps returns JSON array', () => {
    const serializer = new TraversalSerializer();
    const json = serializer.serializeSteps([{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }]);
    expect(typeof json).toBe('string');
  });

  it('deserializeSteps restores step array', () => {
    const serializer = new TraversalSerializer();
    const steps = [{ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} }];
    const json = serializer.serializeSteps(steps);
    const deserialized = serializer.deserializeSteps(json);
    expect(deserialized.length).toBe(1);
    expect(deserialized[0]!.nodeId).toBe('A');
  });

  it('deserializeSteps throws for non-array', () => {
    const serializer = new TraversalSerializer();
    expect(() => serializer.deserializeSteps('{}')).toThrow(SerializationError);
  });

  it('verifySerialization returns true for round-trip', () => {
    const serializer = new TraversalSerializer();
    const traversal = makeTraversalResult();
    expect(serializer.verifySerialization(traversal)).toBe(true);
  });

  it('verifySerialization returns true for valid data', () => {
    const serializer = new TraversalSerializer();
    const traversal = makeTraversalResult();
    expect(serializer.verifySerialization(traversal)).toBe(true);
  });
});

describe('QuerySerializer', () => {
  it('serialize produces JSON', () => {
    const serializer = new QuerySerializer();
    const query: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const json = serializer.serialize(query);
    expect(typeof json).toBe('string');
  });

  it('deserialize restores query', () => {
    const serializer = new QuerySerializer();
    const query: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const json = serializer.serialize(query);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.id).toBe('q1');
  });

  it('deserialize throws for invalid JSON', () => {
    const serializer = new QuerySerializer();
    expect(() => serializer.deserialize('bad')).toThrow(SerializationError);
  });

  it('serialize and deserialize round-trips', () => {
    const serializer = new QuerySerializer();
    const query: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' };
    const json = serializer.serialize(query);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.id).toBe('q1');
  });

  it('deserialize maps conditions back', () => {
    const serializer = new QuerySerializer();
    const query: GraphQuery = { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [{ field: 'type', operator: 'EQ', value: 'module' }] }, parameters: {}, fingerprint: 'fp' };
    const json = serializer.serialize(query);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.clauses.conditions.length).toBe(1);
  });
});

describe('PathSerializer (serialization module)', () => {
  it('serialize and deserialize round-trips', () => {
    const serializer = new PathSerializer();
    const path = {
      nodes: ['A', 'B', 'D', 'F'],
      edges: ['e1', 'e3', 'e6'],
      totalWeight: 3,
      nodeCount: 4,
      edgeCount: 3,
      riskScore: 0,
      riskLevel: 'NONE' as const,
      fingerprint: 'fp-path',
    };
    const json = serializer.serialize(path);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.nodes).toEqual(path.nodes);
  });

  it('deserialize throws for invalid input', () => {
    const serializer = new PathSerializer();
    expect(() => serializer.deserialize('bad')).toThrow(SerializationError);
  });

  it('toNodeSequence returns node array', () => {
    const serializer = new PathSerializer();
    const path = {
      nodes: ['A', 'B'],
      edges: ['e1'],
      totalWeight: 1,
      nodeCount: 2,
      edgeCount: 1,
      riskScore: 0,
      riskLevel: 'NONE' as const,
      fingerprint: 'fp',
    };
    const seq = serializer.toNodeSequence(path);
    expect(seq).toEqual(['A', 'B']);
  });
});

describe('NeighborhoodSerializer', () => {
  it('serialize produces JSON', () => {
    const serializer = new NeighborhoodSerializer();
    const nbhd = { center: 'A', nodes: ['A', 'B'], edges: ['e1'], radius: 1, nodeCount: 2, edgeCount: 1, density: 0.5, fingerprint: 'fp' };
    const json = serializer.serialize(nbhd);
    expect(typeof json).toBe('string');
  });

  it('deserialize restores neighborhood', () => {
    const serializer = new NeighborhoodSerializer();
    const nbhd = { center: 'A', nodes: ['A', 'B'], edges: ['e1'], radius: 1, nodeCount: 2, edgeCount: 1, density: 0.5, fingerprint: 'fp' };
    const json = serializer.serialize(nbhd);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.center).toBe('A');
    expect(deserialized.nodes).toEqual(['A', 'B']);
  });

  it('deserialize throws for invalid JSON', () => {
    const serializer = new NeighborhoodSerializer();
    expect(() => serializer.deserialize('bad')).toThrow(SerializationError);
  });

  it('serializeNeighborhoods produces JSON array', () => {
    const serializer = new NeighborhoodSerializer();
    const nbhd = { center: 'A', nodes: ['A'], edges: [], radius: 1, nodeCount: 1, edgeCount: 0, density: 0, fingerprint: 'fp' };
    const json = serializer.serializeNeighborhoods([nbhd]);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });
});

describe('Canonicalization', () => {
  it('canonicalize sorts object keys', () => {
    const result = Canonicalization.canonicalize({ b: 2, a: 1, c: 3 });
    const keys = Object.keys(result);
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('canonicalize produces stable fingerprint via canonicalJson', () => {
    const a = Canonicalization.canonicalJson({ b: 2, a: 1 });
    const b = Canonicalization.canonicalJson({ a: 1, b: 2 });
    expect(a).toEqual(b);
  });

  it('canonicalize handles nested objects', () => {
    const result = Canonicalization.canonicalize({ meta: { b: 2, a: 1 }, id: 'x' });
    const keys = Object.keys(result);
    expect(keys).toEqual(['id', 'meta']);
  });

  it('deterministicHash returns string', () => {
    const hash = Canonicalization.deterministicHash({ a: 1, b: 2 });
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('stableStringify produces deterministic output', () => {
    const a = Canonicalization.stableStringify({ b: 2, a: 1 });
    const b = Canonicalization.stableStringify({ a: 1, b: 2 });
    expect(a).toEqual(b);
  });
});
