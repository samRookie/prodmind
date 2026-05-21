import { describe, it, expect } from 'vitest';
import { rankRetrievedNodes, computeRetrievalWeight, applyMetricWeighting, applySemanticWeighting, applyRiskWeighting } from '../../retrieval/retrieval-ranking.ts';
import type { RetrievalContext, RetrievedNode } from '../../retrieval/retrieval-types.ts';
import { RetrievalOrdering } from '@prodmind/contracts';
import type { SemanticType } from '@prodmind/contracts';

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
    language: 'ts',
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

describe('rankRetrievedNodes', () => {
  it('returns deterministic order for same-depth nodes', () => {
    const nodes = [
      makeNode({ nodeId: 'c', depth: 0 }),
      makeNode({ nodeId: 'a', depth: 0 }),
      makeNode({ nodeId: 'b', depth: 0 }),
    ];
    const ranked = rankRetrievedNodes(nodes, RetrievalOrdering.DETERMINISTIC, EMPTY_CTX);
    expect(ranked.map((n) => n.nodeId)).toEqual(['a', 'b', 'c']);
  });
});

describe('computeRetrievalWeight', () => {
  it('returns 0 for node with no metrics', () => {
    const node = makeNode({ nodeId: 'test' });
    const weight = computeRetrievalWeight(node, EMPTY_CTX);
    expect(weight).toBe(0);
  });

  it('returns higher weight for node with centrality', () => {
    const ctxWithCent = {
      ...EMPTY_CTX,
      centralityMap: new Map([['centNode', { nodeId: 'centNode', filePath: '', inDegree: 0, outDegree: 0, reachabilityCount: 0, dependencyInfluenceScore: 10, isUtilityHub: false }]]),
    } as RetrievalContext;
    const node = makeNode({ nodeId: 'centNode', centralityScore: 10 });
    const weight = computeRetrievalWeight(node, ctxWithCent);
    expect(weight).toBeGreaterThan(0);
  });
});

describe('applyMetricWeighting', () => {
  it('returns deterministic results with tiebreaker', () => {
    const nodes = [
      makeNode({ nodeId: 'b', centralityScore: 5 }),
      makeNode({ nodeId: 'a', centralityScore: 5 }),
    ];
    const weighted = applyMetricWeighting(nodes, EMPTY_CTX);
    expect(weighted.map((n) => n.nodeId)).toEqual(['a', 'b']);
  });
});

describe('applySemanticWeighting', () => {
  it('sorts DOMAIN_LAYER above TESTING', () => {
    const nodes = [
      makeNode({ nodeId: 'test', semanticType: 'TESTING' as SemanticType }),
      makeNode({ nodeId: 'domain', semanticType: 'DOMAIN_LAYER' as SemanticType }),
    ];
    const sorted = applySemanticWeighting(nodes, EMPTY_CTX);
    expect(sorted[0]!.nodeId).toBe('domain');
    expect(sorted[1]!.nodeId).toBe('test');
  });
});

describe('applyRiskWeighting', () => {
  it('sorts by risk descending', () => {
    const nodes = [
      makeNode({ nodeId: 'low', propagationRiskScore: 0.2 }),
      makeNode({ nodeId: 'high', propagationRiskScore: 0.9 }),
    ];
    const sorted = applyRiskWeighting(nodes, EMPTY_CTX);
    expect(sorted[0]!.nodeId).toBe('high');
    expect(sorted[1]!.nodeId).toBe('low');
  });
});
