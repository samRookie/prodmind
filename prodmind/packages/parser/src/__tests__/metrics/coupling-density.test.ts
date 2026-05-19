import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeCouplingDensity } from '../../metrics/coupling-density.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('computeCouplingDensity', () => {
  it('computes global density', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCouplingDensity(cache);
    expect(result.globalDensity).toBe(1);
  });

  it('computes cluster densities combining namespace, connectivity, semantic', () => {
    const nodes = [
      makeNode('n1', 'src/services/user.ts'),
      makeNode('n2', 'src/services/order.ts'),
    ];
    const edges = [makeEdge('e1', 'n1', 'n2')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCouplingDensity(cache);
    const svc = result.clusterDensities.find((c) => c.clusterName === 'services');
    expect(svc).toBeDefined();
    expect(svc!.nodeCount).toBe(2);
  });

  it('computes edge concentration', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCouplingDensity(cache);
    expect(result.edgeConcentration).toBeGreaterThan(0);
  });

  it('computes internal vs external ratios', () => {
    const nodes = [
      makeNode('n1', 'src/services/user.ts'),
      makeNode('n2', 'src/services/order.ts'),
      makeNode('n3', 'src/routes/api.ts'),
    ];
    const edges = [
      makeEdge('e1', 'n1', 'n2'),
      makeEdge('e2', 'n1', 'n3'),
    ];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCouplingDensity(cache);
    const n1 = result.internalVsExternalRatios.find((r) => r.nodeId === 'n1');
    expect(n1).toBeDefined();
    expect(n1!.internalRatio).toBeGreaterThan(0);
  });

  it('handles empty graph', () => {
    const cache = createGraphAnalysisCache([], [], 'snap-1');
    const result = computeCouplingDensity(cache);
    expect(result.globalDensity).toBe(0);
    expect(result.clusterDensities).toEqual([]);
  });

  it('handles isolated subgraph', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const cache = createGraphAnalysisCache(nodes, [], 'snap-1');
    const result = computeCouplingDensity(cache);
    expect(result.globalDensity).toBe(0);
  });
});
