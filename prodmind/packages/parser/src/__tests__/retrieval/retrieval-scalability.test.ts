import { describe, it, expect } from 'vitest';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';
import { retrieveDependencyNeighborhood } from '../../retrieval/graph-neighborhood.ts';

function makeScaleNodes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`, filePath: `src/file-${i}.ts`, fileHash: null,
    nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null,
  }));
}

function makeScaleEdges(count: number) {
  const edges: Array<any> = [];
  for (let i = 0; i < count - 1; i++) {
    edges.push({ id: `e${i}`, sourceNodeId: `n${i}`, targetNodeId: `n${i + 1}`, edgeType: 'IMPORTS', weight: 1, metadataJson: null });
  }
  return edges;
}

describe('retrieval-scalability', () => {
  const sizes = [10, 100, 1000];
  for (const size of sizes) {
    it(`retrieveDependencyNeighborhood on ${size}-node chain (depth=3)`, () => {
      const nodes = makeScaleNodes(size);
      const edges = makeScaleEdges(size);
      const ctx = createRetrievalCache({ nodes, edges });
      const start = performance.now();
      const result = retrieveDependencyNeighborhood(ctx, ['n0'], 3);
      const elapsed = performance.now() - start;
      expect(result.nodes.length).toBe(4);
      expect(elapsed).toBeLessThan(2000);
    });
  }

  it('retrieveDependencyNeighborhood on 10000-node chain (depth=3) under 2s', () => {
    const nodes = makeScaleNodes(10000);
    const edges = makeScaleEdges(10000);
    const ctx = createRetrievalCache({ nodes, edges });
    const start = performance.now();
    const result = retrieveDependencyNeighborhood(ctx, ['n0'], 3);
    const elapsed = performance.now() - start;
    expect(result.nodes.length).toBe(4);
    expect(elapsed).toBeLessThan(2000);
  });

  it('retrieveDependencyNeighborhood on 1000-node chain (depth=50 scales near-linear)', () => {
    const nodes = makeScaleNodes(1000);
    const edges = makeScaleEdges(1000);
    const ctx = createRetrievalCache({ nodes, edges });
    const start = performance.now();
    const result = retrieveDependencyNeighborhood(ctx, ['n0'], 50);
    const elapsed = performance.now() - start;
    expect(result.nodes.length).toBe(51);
    expect(elapsed).toBeLessThan(500);
  });
});