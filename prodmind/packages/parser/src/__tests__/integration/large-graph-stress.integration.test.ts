import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../retrieval/index.ts';
import { MetricsEngine } from '../../metrics/index.ts';
import { IntegrityEngine } from '../../validation/index.ts';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import { generateMesh } from '../test-utils/synthetic-graph-generator.ts';
import { fingerprintRetrievalResult } from '../test-utils/graph-fingerprinter.ts';
import { measureDuration, measureHeapGrowth, assertBoundedGrowth, formatDuration } from '../test-utils/benchmark-helpers.ts';

interface ScaleResult {
  nodeCount: number;
  ingestionMs: number;
  retrievalMs: number;
  validationMs: number;
  metricsMs: number;
  heapDeltaMB: number;
}

function buildScaleResult(nodeCount: number, seed: number): ScaleResult {
  const graph = generateMesh({ nodeCount, seed, edgeFactor: 3 });
  const retrievalInput = {
    nodes: graph.nodes.map((n) => ({
      id: n.id, filePath: n.filePath, fileHash: n.fileHash,
      nodeType: n.nodeType, symbolName: n.symbolName, language: n.language, metadataJson: n.metadataJson,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
      edgeType: e.edgeType, weight: e.weight, metadataJson: e.metadataJson,
    })),
    snapshotId: graph.snapshotId,
  };

  const retrievalEngine = new RetrievalEngine();
  const metricsEngine = new MetricsEngine();
  const integrityEngine = new IntegrityEngine();

  const seedIds = graph.nodes.length > 0 ? [graph.nodes[0]!.id] : [];

  const { durationMs: retrievalMs } = measureDuration(() => {
    retrievalEngine.retrieve(retrievalInput, {
      snapshotId: graph.snapshotId,
      strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE,
      seedNodeIds: seedIds,
      maxDepth: 3,
      maxResults: 100,
      ordering: RetrievalOrdering.DETERMINISTIC,
    });
  });

  const { durationMs: metricsMs } = measureDuration(() => {
    metricsEngine.analyze({ nodes: graph.nodes, edges: graph.edges, snapshotId: graph.snapshotId });
  });

  const { durationMs: validationMs } = measureDuration(() => {
    integrityEngine.validate({
      snapshotId: graph.snapshotId,
      nodes: graph.nodes,
      edges: graph.edges,
      retrievalAvailable: true,
    });
  });

  const heapGrowth = measureHeapGrowth(() => {
    for (let i = 0; i < 3; i++) {
      retrievalEngine.retrieve(retrievalInput, {
        snapshotId: graph.snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds: seedIds,
        maxDepth: 3,
        maxResults: 100,
        ordering: RetrievalOrdering.DETERMINISTIC,
      });
    }
  });

  const ingestionMs = retrievalMs + metricsMs + validationMs;

  return {
    nodeCount,
    ingestionMs,
    retrievalMs,
    validationMs,
    metricsMs,
    heapDeltaMB: heapGrowth.heapDeltaMB,
  };
}

function logScaleResults(results: ScaleResult[]): void {
  console.log('\n=== Large Graph Stress Results ===');
  for (const r of results) {
    console.log(
      `  ${r.nodeCount.toString().padStart(5)} nodes: ` +
      `ingestion=${formatDuration(r.ingestionMs)}, ` +
      `retrieval=${formatDuration(r.retrievalMs)}, ` +
      `validation=${formatDuration(r.validationMs)}, ` +
      `metrics=${formatDuration(r.metricsMs)}, ` +
      `heapΔ=${r.heapDeltaMB.toFixed(1)}MB`,
    );
  }
  if (results.length >= 2) {
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1]!;
      const curr = results[i]!;
      const ratio = curr.ingestionMs / prev.ingestionMs;
      const scaleFactor = curr.nodeCount / prev.nodeCount;
      console.log(`  Scale ${prev.nodeCount}→${curr.nodeCount}: ingestion ratio=${ratio.toFixed(2)}x (scale=${scaleFactor.toFixed(1)}x)`);
    }
  }
  console.log('');
}

describe('large graph stress', { timeout: 300_000 }, () => {
  const scales = [
    { nodes: 100, seed: 42 },
    { nodes: 500, seed: 42 },
    { nodes: 1_000, seed: 42 },
  ];

  if (!process.env['CI']) {
    scales.push(
      { nodes: 5_000, seed: 42 },
      { nodes: 10_000, seed: 42 },
    );
  }

  const results: ScaleResult[] = [];

  for (const scale of scales) {
    it(`graph with ${scale.nodes} nodes completes within targets`, () => {
      const result = buildScaleResult(scale.nodes, scale.seed);
      results.push(result);

      if (scale.nodes === 100) {
        expect(result.retrievalMs).toBeLessThan(2000);
        expect(result.validationMs).toBeLessThan(5000);
      }
      if (scale.nodes === 1_000) {
        expect(result.retrievalMs).toBeLessThan(2000);
        expect(result.validationMs).toBeLessThan(5000);
      }
      if (scale.nodes === 10_000) {
        expect(result.retrievalMs).toBeLessThan(2000);
        expect(result.validationMs).toBeLessThan(5000);
      }

      expect(result.heapDeltaMB).toBeLessThan(200);
    });
  }

  it('retrieval determinism holds at scale', () => {
    const graph = generateMesh({ nodeCount: 1000, seed: 99 });
    const engine = new RetrievalEngine();
    const input = {
      nodes: graph.nodes.map((n) => ({
        id: n.id, filePath: n.filePath, fileHash: n.fileHash,
        nodeType: n.nodeType, symbolName: n.symbolName, language: n.language, metadataJson: n.metadataJson,
      })),
      edges: graph.edges.map((e) => ({
        id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
        edgeType: e.edgeType, weight: e.weight, metadataJson: e.metadataJson,
      })),
      snapshotId: graph.snapshotId,
    };
    const seedIds = [graph.nodes[0]!.id];
    const fp1 = fingerprintRetrievalResult(engine.retrieve(input, {
      snapshotId: graph.snapshotId, strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE, seedNodeIds: seedIds, maxDepth: 3, maxResults: 100,
      ordering: RetrievalOrdering.DETERMINISTIC,
    }));
    const fp2 = fingerprintRetrievalResult(engine.retrieve(input, {
      snapshotId: graph.snapshotId, strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
      scope: RetrievalScope.NODE, seedNodeIds: seedIds, maxDepth: 3, maxResults: 100,
      ordering: RetrievalOrdering.DETERMINISTIC,
    }));
    expect(fp1).toBe(fp2);
  });

  it('reports scaling results', () => {
    logScaleResults(results);
    if (results.length >= 3) {
      for (let i = 1; i < results.length; i++) {
        assertBoundedGrowth(
          results[i - 1]!.ingestionMs,
          results[i]!.ingestionMs,
          5.0,
          `Ingestion ${results[i - 1]!.nodeCount}→${results[i]!.nodeCount}`,
        );
      }
    }
  });
});
