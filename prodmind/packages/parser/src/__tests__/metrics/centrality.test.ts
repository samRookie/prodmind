import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeCentrality } from '../../metrics/centrality.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string, weight = 1.0): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight, metadataJson: null };
}

describe('computeCentrality', () => {
  it('computes in-degree centrality', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'b', 'a'), makeEdge('e2', 'c', 'a')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCentrality(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a).toBeDefined();
    expect(a!.inDegree).toBe(2);
    expect(a!.outDegree).toBe(0);
  });

  it('computes out-degree centrality', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'a', 'c')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCentrality(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a).toBeDefined();
    expect(a!.outDegree).toBe(2);
    expect(a!.inDegree).toBe(0);
  });

  it('computes reachability count via SCC condensation', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCentrality(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a).toBeDefined();
    expect(a!.reachabilityCount).toBe(3);
    const c = result.find((r) => r.nodeId === 'c');
    expect(c!.reachabilityCount).toBe(1);
  });

  it('applies utility dampening for high fan-out nodes', () => {
    const nodes = [makeNode('util', 'util.ts'), makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [
      makeEdge('e1', 'util', 'a'), makeEdge('e2', 'util', 'b'),
      makeEdge('e3', 'util', 'a'), makeEdge('e4', 'util', 'b'),
    ];
    for (let i = 0; i < 20; i++) {
      const n = makeNode(`n${i}`, `n${i}.ts`);
      nodes.push(n);
      edges.push(makeEdge(`eu${i}`, 'util', `n${i}`));
    }
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeCentrality(cache);
    const util = result.find((r) => r.nodeId === 'util');
    expect(util).toBeDefined();
    expect(util!.isUtilityHub).toBe(true);
  });

  it('returns deterministic output for same input', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const first = computeCentrality(createGraphAnalysisCache(nodes, edges, 'snap-1'));
    const second = computeCentrality(createGraphAnalysisCache(nodes, edges, 'snap-1'));
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.dependencyInfluenceScore).toBe(second[i]!.dependencyInfluenceScore);
    }
  });

  it('handles empty graph', () => {
    const result = computeCentrality(createGraphAnalysisCache([], [], 'snap-1'));
    expect(result).toEqual([]);
  });

  it('handles isolated subgraph', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const result = computeCentrality(createGraphAnalysisCache(nodes, [], 'snap-1'));
    expect(result.length).toBe(2);
    for (const r of result) {
      expect(r.inDegree).toBe(0);
      expect(r.outDegree).toBe(0);
      expect(r.reachabilityCount).toBe(1);
    }
  });

  it('handles cyclic graph without infinite loop', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'a')];
    const result = computeCentrality(createGraphAnalysisCache(nodes, edges, 'snap-1'));
    expect(result.length).toBe(2);
  });
});
