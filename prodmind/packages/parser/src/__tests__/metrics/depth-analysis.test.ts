import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeDepthAnalysis } from '../../metrics/depth-analysis.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('computeDepthAnalysis', () => {
  it('computes max depth for a chain', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeDepthAnalysis(cache);
    expect(result.maxDepth).toBe(3);
  });

  it('computes average depth', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeDepthAnalysis(cache);
    expect(result.averageDepth).toBeGreaterThan(0);
  });

  it('reports depth distribution across bins', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeDepthAnalysis(cache);
    const binCount = result.depthDistribution.reduce((sum, b) => sum + b.count, 0);
    expect(binCount).toBe(2);
  });

  it('detects excessively deep chains (> 10)', () => {
    const nodes: MetricsNode[] = [];
    const edges: MetricsEdge[] = [];
    for (let i = 0; i < 15; i++) {
      nodes.push(makeNode(`n${i}`, `n${i}.ts`));
      if (i > 0) edges.push(makeEdge(`e${i}`, `n${i - 1}`, `n${i}`));
    }
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeDepthAnalysis(cache);
    expect(result.hasExcessivelyDeepChains).toBe(true);
  });

  it('detects layering violations', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [
      makeEdge('e1', 'a', 'b'),
      makeEdge('e2', 'c', 'a'),
    ];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeDepthAnalysis(cache);
    expect(result.layeringViolations).toBeDefined();
  });

  it('handles empty graph', () => {
    const cache = createGraphAnalysisCache([], [], 'snap-1');
    const result = computeDepthAnalysis(cache);
    expect(result.maxDepth).toBe(0);
    expect(result.averageDepth).toBe(0);
  });
});
