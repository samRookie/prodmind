import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../retrieval/index.ts';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import { generateMesh } from '../test-utils/synthetic-graph-generator.ts';

describe('retrieval stability hardening', { timeout: 120_000 }, () => {
  const NODE_COUNT = 500;
  const SEED = 42;
  const RUNS = 50;

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

  it('neighborhood retrieval with equal-depth tiebreaker is stable', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 10,
        maxResults: 200,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      const fp = JSON.stringify(result.nodes.map((n) => n.nodeId));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('blast radius retrieval with equal-risk tiebreaker is stable', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.BLAST_RADIUS,
        scope: RetrievalScope.NODE,
        seedNodeIds: [seedNodeIds[0]!],
        maxDepth: 5,
        ordering: RetrievalOrdering.RISK_DESC,
      });
      const fp = JSON.stringify(result.nodes.map((n) => n.nodeId));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('metric-weighted ranking with equal scores is stable', () => {
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
      const fp = JSON.stringify(result.nodes.map((n) => `${n.nodeId}:${n.centralityScore}`));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('semantic importance ordering with tiebreaker is stable', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 3,
        maxResults: 100,
        ordering: RetrievalOrdering.SEMANTIC_IMPORTANCE_DESC,
      });
      const fp = JSON.stringify(result.nodes.map((n) => n.nodeId));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('architectural slice retrieval ordering is stable', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.ARCHITECTURAL_SLICE,
        scope: RetrievalScope.NODE,
        seedNodeIds: [],
        maxDepth: 5,
        maxResults: 100,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      const fp = JSON.stringify(result.nodes.map((n) => n.nodeId));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('retrieval edge ordering is stable across runs', () => {
    const fingerprints = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 3,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      const fp = JSON.stringify(result.edges.map((e) => `${e.sourceNodeId}->${e.targetNodeId}`));
      fingerprints.add(fp);
    }
    expect(fingerprints.size).toBe(1);
  });

  it('retrieval metadata stats are consistent across runs', () => {
    const results: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const result = engine.retrieve(retrievalInput, {
        snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds,
        maxDepth: 5,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
      results.push(result.stats.totalNodes);
    }
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});
