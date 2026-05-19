import { describe, it, expect } from 'vitest';
import { createGraphAnalysisCache } from '../../metrics/graph-analysis-cache.ts';
import { computeInstability, classifyInstability } from '../../metrics/instability.ts';
import { InstabilityLevel } from '@prodmind/contracts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function makeNode(id: string, filePath: string): MetricsNode {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName: null, language: 'TypeScript', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string): MetricsEdge {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1.0, metadataJson: null };
}

describe('classifyInstability', () => {
  it('classifies VOLATILE for I > 0.8', () => {
    expect(classifyInstability(0.9)).toBe(InstabilityLevel.VOLATILE);
  });

  it('classifies UNSTABLE for I > 0.6', () => {
    expect(classifyInstability(0.7)).toBe(InstabilityLevel.UNSTABLE);
  });

  it('classifies BALANCED for I >= 0.3 && I <= 0.6', () => {
    expect(classifyInstability(0.3)).toBe(InstabilityLevel.BALANCED);
    expect(classifyInstability(0.5)).toBe(InstabilityLevel.BALANCED);
    expect(classifyInstability(0.6)).toBe(InstabilityLevel.BALANCED);
  });

  it('classifies STABLE for I < 0.3', () => {
    expect(classifyInstability(0)).toBe(InstabilityLevel.STABLE);
    expect(classifyInstability(0.2)).toBe(InstabilityLevel.STABLE);
  });
});

describe('computeInstability', () => {
  it('computes I = fanOut / (fanIn + fanOut)', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeInstability(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a!.instabilityScore).toBe(1);
    expect(a!.instabilityLevel).toBe(InstabilityLevel.VOLATILE);
    const b = result.find((r) => r.nodeId === 'b');
    expect(b!.instabilityScore).toBe(0);
    expect(b!.instabilityLevel).toBe(InstabilityLevel.STABLE);
  });

  it('handles division by zero (isolated node)', () => {
    const nodes = [makeNode('a', 'a.ts')];
    const cache = createGraphAnalysisCache(nodes, [], 'snap-1');
    const result = computeInstability(cache);
    expect(result[0]!.instabilityScore).toBe(0);
    expect(result[0]!.instabilityLevel).toBe(InstabilityLevel.STABLE);
  });

  it('detects volatile core (high fanIn + high instability)', () => {
    const nodes = [makeNode('core', 'core.ts'), makeNode('a', 'a.ts')];
    const edges: MetricsEdge[] = [];
    for (let i = 0; i < 20; i++) {
      const n = makeNode(`n${i}`, `n${i}.ts`);
      nodes.push(n);
      edges.push(makeEdge(`e${i}a`, `n${i}`, 'core'));
    }
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeInstability(cache);
    const core = result.find((r) => r.nodeId === 'core');
    expect(core!.instabilityScore).toBe(0);
    expect(core!.isVolatileCore).toBe(false);
  });

  it('detects inversion risk (fanOut > 3x fanIn with moderate+ fanIn)', () => {
    const nodes = [makeNode('a', 'a.ts'), makeNode('b', 'b.ts'), makeNode('c', 'c.ts')];
    const edges = [
      makeEdge('e1', 'b', 'a'),
      makeEdge('e2', 'b', 'a'),
      makeEdge('e3', 'b', 'a'),
      makeEdge('e4', 'b', 'a'),
      makeEdge('e5', 'b', 'a'),
      makeEdge('e6', 'a', 'c'),
      makeEdge('e7', 'a', 'c'),
      makeEdge('e8', 'a', 'c'),
      makeEdge('e9', 'a', 'c'),
      makeEdge('e10', 'a', 'c'),
      makeEdge('e11', 'a', 'c'),
      makeEdge('e12', 'a', 'c'),
      makeEdge('e13', 'a', 'c'),
      makeEdge('e14', 'a', 'c'),
      makeEdge('e15', 'a', 'c'),
      makeEdge('e16', 'a', 'c'),
      makeEdge('e17', 'a', 'c'),
      makeEdge('e18', 'a', 'c'),
      makeEdge('e19', 'a', 'c'),
      makeEdge('e20', 'a', 'c'),
      makeEdge('e21', 'a', 'c'),
      makeEdge('e22', 'a', 'c'),
      makeEdge('e23', 'a', 'c'),
      makeEdge('e24', 'a', 'c'),
      makeEdge('e25', 'a', 'c'),
    ];
    const cache = createGraphAnalysisCache(nodes, edges, 'snap-1');
    const result = computeInstability(cache);
    const a = result.find((r) => r.nodeId === 'a');
    expect(a!.hasInversionRisk).toBe(true);
  });
});
