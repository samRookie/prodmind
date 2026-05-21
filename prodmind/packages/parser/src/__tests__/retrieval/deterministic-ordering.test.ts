import { describe, it, expect } from 'vitest';
import { stableNodeSort, stableEdgeSort, stableMetricSort } from '../../retrieval/deterministic-ordering.ts';
import type { RetrievalContext, RetrievedNode, RetrievedEdge } from '../../retrieval/retrieval-types.ts';
import { RetrievalOrdering } from '@prodmind/contracts';

const EMPTY_CTX = {
  adjacency: new Map(),
  reverseAdjacency: new Map(),
  adjacencyEdge: new Map(),
  nodeMap: new Map(),
  edgeMap: new Map(),
  semanticMap: new Map(),
  centralityMap: new Map(),
  instabilityMap: new Map(),
  propagationRiskMap: new Map(),
  fanMetricsMap: new Map(),
  namespaceMap: new Map(),
  symbolNamespaceMap: new Map(),
  symbolOwnershipMap: new Map(),
  sortedNodeIds: [],
} as RetrievalContext;

function makeNode(overrides: Partial<RetrievedNode>): RetrievedNode {
  return {
    nodeId: 'n1',
    filePath: '/file.ts',
    depth: 0,
    nodeType: 'FILE',
    language: 'typescript',
    symbolName: null,
    centralityScore: null,
    instabilityScore: null,
    propagationRiskScore: null,
    fanIn: null,
    fanOut: null,
    semanticType: null,
    classification: null,
    ...overrides,
  };
}

function makeEdge(overrides: Partial<RetrievedEdge>): RetrievedEdge {
  return {
    edgeId: 'e1',
    sourceNodeId: 'a',
    targetNodeId: 'b',
    edgeType: 'IMPORTS',
    weight: null,
    metadataJson: null,
    ...overrides,
  };
}

describe('stableNodeSort', () => {
  it('sorts by depth ascending by default', () => {
    const nodes = [
      makeNode({ nodeId: 'c', depth: 2 }),
      makeNode({ nodeId: 'a', depth: 0 }),
      makeNode({ nodeId: 'b', depth: 1 }),
    ];
    const sorted = stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    expect(sorted.map((n) => n.nodeId)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by depth descending', () => {
    const nodes = [
      makeNode({ nodeId: 'a', depth: 0 }),
      makeNode({ nodeId: 'c', depth: 2 }),
      makeNode({ nodeId: 'b', depth: 1 }),
    ];
    const sorted = stableNodeSort(nodes, RetrievalOrdering.DEPTH_DESC, EMPTY_CTX);
    expect(sorted.map((n) => n.nodeId)).toEqual(['c', 'b', 'a']);
  });

  it('uses nodeId as tiebreaker for same depth', () => {
    const nodes = [
      makeNode({ nodeId: 'b', depth: 0 }),
      makeNode({ nodeId: 'c', depth: 0 }),
      makeNode({ nodeId: 'a', depth: 0 }),
    ];
    const sorted = stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    expect(sorted.map((n) => n.nodeId)).toEqual(['a', 'b', 'c']);
  });

  it('is deterministic across multiple runs', () => {
    const nodes = [
      makeNode({ nodeId: 'z', depth: 2 }),
      makeNode({ nodeId: 'm', depth: 1 }),
      makeNode({ nodeId: 'a', depth: 0 }),
    ];
    const run1 = stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    const run2 = stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    const run3 = stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    expect(run1.map((n) => n.nodeId)).toEqual(run2.map((n) => n.nodeId));
    expect(run2.map((n) => n.nodeId)).toEqual(run3.map((n) => n.nodeId));
  });
});

describe('stableEdgeSort', () => {
  it('sorts by source, then target, then id', () => {
    const edges = [
      makeEdge({ edgeId: 'e3', sourceNodeId: 'b', targetNodeId: 'a' }),
      makeEdge({ edgeId: 'e1', sourceNodeId: 'a', targetNodeId: 'b' }),
      makeEdge({ edgeId: 'e2', sourceNodeId: 'a', targetNodeId: 'a' }),
    ];
    const sorted = stableEdgeSort(edges);
    expect(sorted.map((e) => e.edgeId)).toEqual(['e2', 'e1', 'e3']);
  });

  it('is deterministic', () => {
    const edges = [
      makeEdge({ edgeId: 'e2', sourceNodeId: 'z', targetNodeId: 'a' }),
      makeEdge({ edgeId: 'e1', sourceNodeId: 'a', targetNodeId: 'z' }),
    ];
    const run1 = stableEdgeSort(edges);
    const run2 = stableEdgeSort(edges);
    expect(run1.map((e) => e.edgeId)).toEqual(run2.map((e) => e.edgeId));
  });
});

describe('stableMetricSort', () => {
  it('sorts by metric descending then nodeId', () => {
    const records = [
      { nodeId: 'b', score: 50 },
      { nodeId: 'a', score: 100 },
      { nodeId: 'c', score: 50 },
    ];
    const sorted = stableMetricSort(records, (r) => r.score);
    expect(sorted.map((r) => r.nodeId)).toEqual(['a', 'b', 'c']);
  });
});
