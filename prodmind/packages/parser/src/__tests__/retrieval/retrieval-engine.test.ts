import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../retrieval/retrieval-engine.ts';
import type { RetrievalInput } from '../../retrieval/retrieval-engine.ts';
import type { RetrievalQuery } from '../../retrieval/retrieval-types.ts';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';

function makeInput(): RetrievalInput {
  return {
    snapshotId: 'snap-1',
    nodes: [
      { id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: 'foo', language: 'ts', metadataJson: null },
      { id: 'n2', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: 'bar', language: 'ts', metadataJson: null },
      { id: 'n3', filePath: 'src/c.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
      { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
    ],
    centrality: [
      { nodeId: 'n1', filePath: 'src/a.ts', inDegree: 0, outDegree: 1, reachabilityCount: 2, dependencyInfluenceScore: 0.8, isUtilityHub: false },
    ],
  };
}

describe('RetrievalEngine', () => {
  const engine = new RetrievalEngine();

  it('retrieve neighborhood returns nodes with metadata', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      seedNodeIds: ['n1'],
      maxDepth: 2,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const result = engine.retrieve(makeInput(), query);
    expect(result.metadata.snapshotId).toBe('snap-1');
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.stats.totalNodes).toBeGreaterThanOrEqual(2);
  });

  it('retrieve blast radius returns entry point', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.BLAST_RADIUS,
      scope: RetrievalScope.SUBGRAPH,
      seedNodeIds: ['n1'],
      maxDepth: 2,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const result = engine.retrieve(makeInput(), query);
    expect(result.nodes.some((n) => n.nodeId === 'n1')).toBe(true);
  });

  it('retrieve architectural slice returns filtered nodes', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.ARCHITECTURAL_SLICE,
      scope: RetrievalScope.CLUSTER,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const result = engine.retrieve(makeInput(), query);
    expect(result.metadata.strategy).toBe(RetrievalStrategy.ARCHITECTURAL_SLICE);
  });

  it('throws on missing seedNodeIds for strategy that requires them', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    expect(() => engine.retrieve(makeInput(), query)).toThrow();
  });

  it('produces deterministic results across runs', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      seedNodeIds: ['n1'],
      maxDepth: 2,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const result1 = engine.retrieve(makeInput(), query);
    const result2 = engine.retrieve(makeInput(), query);
    expect(result1.nodes.map((n) => n.nodeId)).toEqual(result2.nodes.map((n) => n.nodeId));
    expect(result1.edges.map((e) => e.edgeId)).toEqual(result2.edges.map((e) => e.edgeId));
  });

  it('limits results to maxResults', () => {
    const query: RetrievalQuery = {
      snapshotId: 'snap-1',
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      seedNodeIds: ['n1'],
      maxDepth: 2,
      maxResults: 1,
      ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const result = engine.retrieve(makeInput(), query);
    expect(result.nodes.length).toBe(1);
  });

  it('snapshot isolation produces independent results per input', () => {
    const inputA: RetrievalInput = {
      snapshotId: 'snap-a',
      nodes: [
        { id: 'a1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
        { id: 'a2', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      ],
      edges: [{ id: 'ea1', sourceNodeId: 'a1', targetNodeId: 'a2', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    };
    const inputB: RetrievalInput = {
      snapshotId: 'snap-b',
      nodes: [
        { id: 'b1', filePath: 'src/x.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
        { id: 'b2', filePath: 'src/y.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
      ],
      edges: [{ id: 'eb1', sourceNodeId: 'b2', targetNodeId: 'b1', edgeType: 'IMPORTS', weight: 1, metadataJson: null }],
    };
    const queryA: RetrievalQuery = {
      snapshotId: 'snap-a', strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE, seedNodeIds: ['a1'], maxDepth: 2, ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const queryB: RetrievalQuery = {
      snapshotId: 'snap-b', strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE, seedNodeIds: ['b1'], maxDepth: 2, ordering: RetrievalOrdering.DETERMINISTIC,
    };
    const resultA = engine.retrieve(inputA, queryA);
    const resultB = engine.retrieve(inputB, queryB);
    expect(resultA.metadata.snapshotId).toBe('snap-a');
    expect(resultB.metadata.snapshotId).toBe('snap-b');
    expect(resultA.nodes.every((n) => !n.nodeId.startsWith('b'))).toBe(true);
    expect(resultB.nodes.every((n) => !n.nodeId.startsWith('a'))).toBe(true);
  });
});
