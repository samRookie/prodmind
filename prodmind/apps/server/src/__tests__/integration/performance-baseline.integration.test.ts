import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '@prodmind/parser';
import { MetricsEngine } from '@prodmind/parser';
import { IntegrityEngine } from '@prodmind/parser';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';

// Inlined benchmark helpers (avoids cross-package test-utils import)
function measureDuration<T>(fn: () => T): { durationMs: number; result: T } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { durationMs, result };
}

function measureHeapGrowth<T>(fn: () => T): { heapDeltaMB: number } {
  const before = process.memoryUsage();
  fn();
  const after = process.memoryUsage();
  return {
    heapDeltaMB: Math.round(((after.heapUsed - before.heapUsed) / 1024 / 1024) * 100) / 100,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Inlined synthetic graph generator
interface GraphNode { id: string; filePath: string; fileHash: string | null; nodeType: string; symbolName: string | null; language: string | null; metadataJson: string | null; }
interface GraphEdge { id: string; sourceNodeId: string; targetNodeId: string; edgeType: string; weight: number | null; metadataJson: string | null; }

function generateInMemoryGraph(nodeCount: number, seed: number, edgeFactor = 3): { nodes: GraphNode[]; edges: GraphEdge[]; snapshotId: string } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const snapshotId = `perf-${seed}`;
  const rng = { next: () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 0) / 4294967296; } };

  for (let i = 0; i < nodeCount; i++) {
    const depth = Math.floor(rng.next() * 3) + 1;
    const parts: string[] = ['repo'];
    for (let d = 0; d < depth; d++) parts.push(['src', 'lib', 'utils'][Math.floor(rng.next() * 3)]!);
    const filePath = `/${parts.join('/')}/module-${i}.ts`;
    nodes.push({
      id: `node-${seed}-${i}`,
      filePath,
      fileHash: `hash-${i}`,
      nodeType: 'FILE',
      symbolName: null,
      language: 'typescript',
      metadataJson: null,
    });
  }

  const edgeSet = new Set<string>();
  let targetEdges = Math.floor(nodeCount * edgeFactor);
  let attempts = 0;
  while (targetEdges > 0 && attempts < nodeCount * 20) {
    attempts++;
    const src = Math.floor(rng.next() * nodeCount);
    const tgt = Math.floor(rng.next() * nodeCount);
    if (src === tgt) continue;
    const key = `${src}:${tgt}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edges.push({
      id: `edge-${seed}-${edges.length}`,
      sourceNodeId: `node-${seed}-${src}`,
      targetNodeId: `node-${seed}-${tgt}`,
      edgeType: 'IMPORTS',
      weight: 0.5 + rng.next() * 0.5,
      metadataJson: null,
    });
    targetEdges--;
  }

  return { nodes, edges, snapshotId };
}

interface BaselineMetric {
  scale: string;
  nodeCount: number;
  edgeCount: number;
  graphBuildMs: number;
  retrievalMs: number;
  metricsMs: number;
  validationMs: number;
  totalMs: number;
  heapDeltaMB: number;
}

describe('performance baselines', { timeout: 300_000 }, () => {
  const scales = [
    { nodeCount: 100, seed: 42 },
    { nodeCount: 500, seed: 42 },
    { nodeCount: 1_000, seed: 42 },
  ];

  if (!process.env['CI']) {
    scales.push(
      { nodeCount: 5_000, seed: 42 },
      { nodeCount: 10_000, seed: 42 },
    );
  }

  const baselines: BaselineMetric[] = [];

  for (const scale of scales) {
    it(`throughput: ${scale.nodeCount} nodes`, () => {
      const { durationMs: graphBuildMs, result: graph } = measureDuration(() =>
        generateInMemoryGraph(scale.nodeCount, scale.seed, 3),
      );

      const retrievalInput = {
        nodes: graph.nodes,
        edges: graph.edges,
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

      const baseline: BaselineMetric = {
        scale: `${scale.nodeCount}`,
        nodeCount: scale.nodeCount,
        edgeCount: graph.edges.length,
        graphBuildMs,
        retrievalMs,
        metricsMs,
        validationMs,
        totalMs: graphBuildMs + retrievalMs + metricsMs + validationMs,
        heapDeltaMB: heapGrowth.heapDeltaMB,
      };
      baselines.push(baseline);

      expect(retrievalMs).toBeLessThan(5000);
      expect(validationMs).toBeLessThan(10000);
      expect(heapGrowth.heapDeltaMB).toBeLessThan(200);
    });
  }

  it('scaling ratio bounds are reasonable', () => {
    if (baselines.length < 2) return;
    for (let i = 1; i < baselines.length; i++) {
      const prev = baselines[i - 1]!;
      const curr = baselines[i]!;
      const scaleFactor = curr.nodeCount / prev.nodeCount;
      const totalRatio = curr.totalMs / prev.totalMs;
      const expectedRatio = scaleFactor * 1.5;
      if (totalRatio > expectedRatio && scaleFactor >= 2) {
        console.warn(
          `  Warning: ${prev.nodeCount}->${curr.nodeCount}: total time ratio ${totalRatio.toFixed(2)}x ` +
          `(expected < ${expectedRatio.toFixed(2)}x for ${scaleFactor.toFixed(1)}x scale)`,
        );
      }
    }
  });

  it('generates baseline report', () => {
    console.log('\n=== Performance Baseline Report ===');
    console.log('Scale | Nodes | Edges | Build | Retrieval | Metrics | Validation | Total | HeapD');
    console.log('------|-------|-------|-------|-----------|---------|------------|-------|------');
    for (const b of baselines) {
      console.log(
        `${b.scale.padStart(5)} | ${b.nodeCount.toString().padStart(5)} | ${b.edgeCount.toString().padStart(5)} | ` +
        `${formatDuration(b.graphBuildMs).padStart(5)} | ${formatDuration(b.retrievalMs).padStart(7)} | ` +
        `${formatDuration(b.metricsMs).padStart(5)} | ${formatDuration(b.validationMs).padStart(7)} | ` +
        `${formatDuration(b.totalMs).padStart(5)} | ${b.heapDeltaMB.toFixed(1)}MB`,
      );
    }

    if (baselines.length >= 2) {
      const fastest = baselines.reduce((a, b) => a.totalMs < b.totalMs ? a : b);
      const slowest = baselines.reduce((a, b) => a.totalMs > b.totalMs ? a : b);
      console.log(`\nFastest: ${fastest.nodeCount} nodes (${formatDuration(fastest.totalMs)})`);
      console.log(`Slowest: ${slowest.nodeCount} nodes (${formatDuration(slowest.totalMs)})`);
    }
  });
});
