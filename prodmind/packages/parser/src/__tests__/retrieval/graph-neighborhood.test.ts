import { describe, it, expect } from 'vitest';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';
import {
  retrieveDependencyNeighborhood,
  retrieveReverseDependencies,
  retrieveBidirectionalNeighborhood,
  retrieveDepthLimitedSubgraph,
} from '../../retrieval/graph-neighborhood.ts';

function makeNodes(count: number, prefix = 'n') {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    filePath: `src/file-${i}.ts`,
    fileHash: null,
    nodeType: 'FILE',
    symbolName: null,
    language: 'ts',
    metadataJson: null,
  }));
}

function makeEdge(source: string, target: string, id = `e-${source}-${target}`) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

describe('graph-neighborhood', () => {
  const nodes = makeNodes(5);
  const edges = [
    makeEdge('n0', 'n1'),
    makeEdge('n1', 'n2'),
    makeEdge('n2', 'n3'),
    makeEdge('n3', 'n4'),
  ];

  const ctx = createRetrievalCache({ nodes, edges });

  it('retrieveDependencyNeighborhood depth 0 returns only seed', () => {
    const result = retrieveDependencyNeighborhood(ctx, ['n0'], 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.nodeId).toBe('n0');
  });

  it('retrieveDependencyNeighborhood depth 1 returns direct deps', () => {
    const result = retrieveDependencyNeighborhood(ctx, ['n0'], 1);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('n0');
    expect(ids).toContain('n1');
    expect(ids).not.toContain('n2');
  });

  it('retrieveDependencyNeighborhood depth 3 returns transitive deps', () => {
    const result = retrieveDependencyNeighborhood(ctx, ['n0'], 3);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('n3');
    expect(ids).not.toContain('n4');
  });

  it('retrieveReverseDependencies finds dependents', () => {
    const result = retrieveReverseDependencies(ctx, ['n4'], 4);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('n0');
    expect(ids).toContain('n1');
  });

  it('retrieveBidirectionalNeighborhood covers both directions', () => {
    const result = retrieveBidirectionalNeighborhood(ctx, ['n2'], 2);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('n0');
    expect(ids).toContain('n1');
    expect(ids).toContain('n3');
    expect(ids).toContain('n4');
  });

  it('retrieveDepthLimitedSubgraph respects direction param', () => {
    const forward = retrieveDepthLimitedSubgraph(ctx, ['n0'], 2, 'forward');
    const backward = retrieveDepthLimitedSubgraph(ctx, ['n4'], 2, 'backward');
    expect(forward.nodes.find((n) => n.nodeId === 'n0')).toBeDefined();
    expect(backward.nodes.find((n) => n.nodeId === 'n4')).toBeDefined();
  });

  it('produces deterministic results across runs', () => {
    const run1 = retrieveDependencyNeighborhood(ctx, ['n0'], 3);
    const run2 = retrieveDependencyNeighborhood(ctx, ['n0'], 3);
    expect(run1.nodes.map((n) => n.nodeId)).toEqual(run2.nodes.map((n) => n.nodeId));
  });

  it('handles empty graph', () => {
    const emptyCtx = createRetrievalCache({ nodes: [], edges: [] });
    const result = retrieveDependencyNeighborhood(emptyCtx, ['missing'], 3);
    expect(result.nodes).toHaveLength(0);
  });

  it('handles cyclic graph without infinite loop', () => {
    const cycleNodes = [
      { id: 'c0', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      { id: 'c1', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      { id: 'c2', filePath: 'src/c.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
    ];
    const cycleEdges = [
      makeEdge('c0', 'c1', 'e0'),
      makeEdge('c1', 'c2', 'e1'),
      makeEdge('c2', 'c0', 'e2'),
    ];
    const cycleCtx = createRetrievalCache({ nodes: cycleNodes, edges: cycleEdges });
    const result = retrieveDependencyNeighborhood(cycleCtx, ['c0'], 5);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('c0');
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    expect(ids.length).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('depth-bound terminates at exact depth', () => {
    const deepNodes = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i}`,
      filePath: `src/deep-${i}.ts`,
      fileHash: null,
      nodeType: 'FILE',
      symbolName: null,
      language: 'ts',
      metadataJson: null,
    }));
    const deepEdges = Array.from({ length: 9 }, (_, i) => makeEdge(`d${i}`, `d${i + 1}`, `ed${i}`));
    const deepCtx = createRetrievalCache({ nodes: deepNodes, edges: deepEdges });
    const result = retrieveDependencyNeighborhood(deepCtx, ['d0'], 3);
    const ids = result.nodes.map((n) => n.nodeId);
    expect(ids).toContain('d3');
    expect(ids).not.toContain('d4');
    expect(result.nodes.length).toBe(4);
    expect(result.maxDepthReached).toBe(3);
  });
});
