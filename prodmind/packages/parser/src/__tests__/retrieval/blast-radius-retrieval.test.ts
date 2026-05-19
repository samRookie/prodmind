import { describe, it, expect } from 'vitest';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';
import { retrieveBlastRadiusSubgraph, rankPropagationRisk, computeTraversalPressure } from '../../retrieval/blast-radius-retrieval.ts';

function makeNodes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    filePath: `src/file-${i}.ts`,
    fileHash: null,
    nodeType: 'FILE',
    symbolName: null,
    language: 'ts',
    metadataJson: null,
  }));
}

function makeEdge(source: string, target: string) {
  return { id: `e-${source}-${target}`, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

describe('blast-radius-retrieval', () => {
  const nodes = makeNodes(5);
  const edges = [
    makeEdge('n0', 'n1'),
    makeEdge('n1', 'n2'),
    makeEdge('n1', 'n3'),
    makeEdge('n2', 'n4'),
  ];

  const ctx = createRetrievalCache({ nodes, edges });

  it('retrieveBlastRadiusSubgraph returns entry point', () => {
    const result = retrieveBlastRadiusSubgraph(ctx, 'n1', 3);
    expect(result.entryPoint.nodeId).toBe('n1');
  });

  it('retrieveBlastRadiusSubgraph finds forward impacts', () => {
    const result = retrieveBlastRadiusSubgraph(ctx, 'n0', 3);
    expect(result.forwardImpacts.length).toBeGreaterThan(0);
    expect(result.forwardImpacts.some((n) => n.nodeId === 'n1')).toBe(true);
  });

  it('retrieveBlastRadiusSubgraph finds backward impacts', () => {
    const result = retrieveBlastRadiusSubgraph(ctx, 'n4', 3);
    expect(result.backwardImpacts.length).toBeGreaterThan(0);
  });

  it('retrieveBlastRadiusSubgraph totalAffected includes entry', () => {
    const result = retrieveBlastRadiusSubgraph(ctx, 'n1', 3);
    expect(result.totalAffected).toBeGreaterThanOrEqual(1);
  });

  it('rankPropagationRisk is deterministic', () => {
    const result = retrieveBlastRadiusSubgraph(ctx, 'n0', 3);
    const allNodes = [result.entryPoint, ...result.forwardImpacts, ...result.backwardImpacts];
    const ranked1 = rankPropagationRisk(allNodes, ctx);
    const ranked2 = rankPropagationRisk(allNodes, ctx);
    expect(ranked1.map((n) => n.nodeId)).toEqual(ranked2.map((n) => n.nodeId));
  });

  it('computeTraversalPressure returns non-negative number', () => {
    const pressure = computeTraversalPressure('n1', ctx);
    expect(pressure).toBeGreaterThanOrEqual(0);
  });

  it('handles missing node', () => {
    const pressure = computeTraversalPressure('missing', ctx);
    expect(pressure).toBe(0);
  });
});
