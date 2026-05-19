import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../retrieval/index.ts';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import { generateMesh } from '../test-utils/synthetic-graph-generator.ts';
import { fingerprintRetrievalResult, fingerprintNeighborhood, fingerprintBlastRadius, fingerprintRanking, fingerprintOrdering } from '../test-utils/graph-fingerprinter.ts';

describe('retrieval determinism', { timeout: 120_000 }, () => {
  const NODE_COUNT = 500;
  const SEED = 42;
  const RUNS = 100;

  const graph = generateMesh({ nodeCount: NODE_COUNT, seed: SEED });
  const snapshotId = graph.snapshotId;
  const seedNodeIds = [graph.nodes[0]!.id, graph.nodes[1]!.id, graph.nodes[2]!.id];
  const engine = new RetrievalEngine();

  const retrievalInput = {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      filePath: n.filePath,
      fileHash: n.fileHash,
      nodeType: n.nodeType,
      symbolName: n.symbolName,
      language: n.language,
      metadataJson: n.metadataJson,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      edgeType: e.edgeType,
      weight: e.weight,
      metadataJson: e.metadataJson,
    })),
    snapshotId,
  };

  it('neighborhood retrieval is deterministic across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 5,
        maxResults: 50,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      fingerprints.add(fingerprintRetrievalResult(result));
    }
    expect(fingerprints.size).toBe(1);
  });

  it('neighborhood sub-result is deterministic across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieveNeighborhood(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 5,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      fingerprints.add(fingerprintNeighborhood(result));
    }
    expect(fingerprints.size).toBe(1);
  });

  it('blast radius retrieval is deterministic across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieveBlastRadius(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.BLAST_RADIUS,
        scope: RetrievalScope.NODE,
        seedNodeIds: [seedNodeIds[0]!],
        maxDepth: 5,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      fingerprints.add(fingerprintBlastRadius(result));
    }
    expect(fingerprints.size).toBe(1);
  });

  it('ranking is deterministic across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.METRIC_WEIGHTED,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 5,
        maxResults: 50,
        ordering: RetrievalOrdering.CENTRALITY_DESC,
      });
      fingerprints.add(fingerprintRanking(result.nodes));
    }
    expect(fingerprints.size).toBe(1);
  });

  it('ordering is stable across 100 runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 5,
        maxResults: 50,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      fingerprints.add(fingerprintOrdering(result.nodes));
    }
    expect(fingerprints.size).toBe(1);
  });
});
