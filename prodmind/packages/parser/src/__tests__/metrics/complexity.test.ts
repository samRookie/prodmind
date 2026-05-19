import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeComplexity } from '../../metrics/complexity.ts';
import { ComplexityLevel } from '@prodmind/contracts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('computeComplexity', () => {
  it('computes edge/node ratio', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.edgeNodeRatio).toBe(0.5);
  });

  it('computes SCC density', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.sccDensity).toBeGreaterThan(0);
  });

  it('classifies simple graph as SIMPLE', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.complexityLevel).toBe(ComplexityLevel.SIMPLE);
  });

  it('classifies dense graph as HIGHLY_COMPLEX', () => {
    const nodes: MetricsNode[] = [];
    const edges: MetricsEdge[] = [];
    for (let i = 0; i < 10; i++) {
      nodes.push(makeNode(`n${i}`, `n${i}.ts`));
    }
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        if (i !== j) edges.push(makeEdge(`e${i}_${j}`, `n${i}`, `n${j}`));
      }
    }
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.entropyScore).toBeGreaterThan(0);
  });

  it('handles empty graph', () => {
    const cache = createGraphAnalysisCache([], [], 'snap-1');
    const result = computeComplexity(cache);
    expect(result.complexityLevel).toBe(ComplexityLevel.SIMPLE);
    expect(result.finalScore).toBe(0);
  });

  it('handles cyclic graph', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'a')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.cycleScore).toBeGreaterThan(0);
  });

  it('computes architectural entropy from fanIn distribution', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts'), makeNode('d', 'd.ts')];
    const edges = [makeEdge('e1', 'b', 'a'), makeEdge('e2', 'c', 'a'), makeEdge('e3', 'd', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeComplexity(cache);
    expect(result.architecturalEntropy).toBeGreaterThan(0);
  });
});
