import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computePropagationRisk } from '../../metrics/propagation-risk.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('computePropagationRisk', () => {
  it('computes propagation pressure bounded by normalization', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computePropagationRisk(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a!.propagationPressure).toBeGreaterThanOrEqual(0);
    expect(a!.propagationPressure).toBeLessThanOrEqual(1);
  });

  it('computes blast radius amplification', () => {
    const nodes = [makeNode('hub', 'hub.ts'), makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'hub', 'a'), makeEdge('e2', 'hub', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computePropagationRisk(cache);
    const hub = result.find((r) => r.nodeId === 'hub');
    expect(hub!.blastRadiusAmplification).toBeGreaterThanOrEqual(0);
  });

  it('estimates cascade impact via bounded BFS', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computePropagationRisk(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a!.cascadeEstimate).toBeGreaterThanOrEqual(0);
  });

  it('detects choke points (high fanIn + high fanOut)', () => {
    const nodes = [makeNode('hub', 'hub.ts'), makeNode('a', 'a.ts')];
    const edges: MetricsEdge[] = [];
    for (let i = 0; i < 10; i++) {
      const n = makeNode(`n${i}`, `n${i}.ts`);
      nodes.push(n);
      edges.push(makeEdge(`e${i}a`, `n${i}`, 'hub'));
      edges.push(makeEdge(`e${i}b`, 'hub', `n${i}`));
    }
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computePropagationRisk(cache);
    const hub = result.find((r) => r.nodeId === 'hub');
    expect(hub!.isChokePoint).toBe(true);
  });

  it('handles empty graph', () => {
    const cache = createGraphAnalysisCache([], [], 'snap-1');
    const result = computePropagationRisk(cache);
    expect(result).toEqual([]);
  });
});
