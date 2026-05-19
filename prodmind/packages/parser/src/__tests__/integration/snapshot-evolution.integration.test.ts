import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../retrieval/index.ts';
import { MetricsEngine } from '../../metrics/index.ts';
import { IntegrityEngine } from '../../validation/index.ts';
import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import { generateSyntheticParsedFiles } from '../test-utils/synthetic-graph-generator.ts';
import { fingerprintRetrievalResult } from '../test-utils/graph-fingerprinter.ts';
import { canonicalFingerprint } from '../test-utils/canonical-json.ts';
import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';

function parsedFilesToGraph(
  parsedFiles: Array<{ path: string; language: string; symbols: unknown[]; imports: Array<{ source: string }> }>,
  snapshotId: string,
): { nodes: MetricsNode[]; edges: MetricsEdge[] } {
  const nodes: MetricsNode[] = [];
  const edges: MetricsEdge[] = [];
  const fileNodeIds = new Map<string, string>();

  for (const pf of parsedFiles) {
    const id = `file-${pf.path.replace(/[^a-zA-Z0-9]/g, '-')}-${snapshotId}`;
    fileNodeIds.set(pf.path, id);
    nodes.push({
      id,
      filePath: pf.path,
      fileHash: `hash-${snapshotId}-${pf.path}`,
      nodeType: 'FILE',
      symbolName: null,
      language: pf.language,
      metadataJson: null,
    });
  }

  for (const pf of parsedFiles) {
    const srcId = fileNodeIds.get(pf.path);
    if (!srcId) continue;
    for (const imp of pf.imports) {
      const targetPath = imp.source.startsWith('./')
        ? `${pf.path.split('/').slice(0, -1).join('/')}/${imp.source.slice(2)}`
        : imp.source;
      const tgtId = fileNodeIds.get(targetPath);
      if (tgtId) {
        edges.push({
          id: `edge-${snapshotId}-${srcId}-${tgtId}`,
          sourceNodeId: srcId,
          targetNodeId: tgtId,
          edgeType: 'IMPORTS',
          weight: 1.0,
          metadataJson: null,
        });
      }
    }
  }

  return { nodes, edges };
}

interface SnapshotState {
  snapshotId: string;
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  retrievalFingerprint: string;
  metricsFingerprint: string;
}

function buildSnapshot(
  baseName: string,
  nodeCount: number,
  seed: number,
  symbolsPerFile: number,
  importsPerFile: number,
): SnapshotState {
  const snapshotId = `snapshot-${baseName}-${seed}`;
  const { parsedFiles } = generateSyntheticParsedFiles({
    nodeCount,
    seed,
    symbolsPerFile,
    importsPerFile,
    edgeFactor: 2,
  });
  const { nodes, edges } = parsedFilesToGraph(parsedFiles, snapshotId);

  const retrievalEngine = new RetrievalEngine();
  const metricsEngine = new MetricsEngine();
  const retrievalInput = {
    nodes: nodes.map((n) => ({
      id: n.id, filePath: n.filePath, fileHash: n.fileHash,
      nodeType: n.nodeType, symbolName: n.symbolName, language: n.language, metadataJson: n.metadataJson,
    })),
    edges: edges.map((e) => ({
      id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
      edgeType: e.edgeType, weight: e.weight, metadataJson: e.metadataJson,
    })),
    snapshotId,
  };

  const seedIds = nodes.length > 0 ? [nodes[0]!.id] : [];
  const retrievalResult = retrievalEngine.retrieve(retrievalInput, {
    snapshotId,
    strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
    scope: RetrievalScope.NODE,
    seedNodeIds: seedIds,
    maxDepth: 3,
    maxResults: 50,
    ordering: RetrievalOrdering.DETERMINISTIC,
  });

  const metricsOutput = metricsEngine.analyze({ nodes, edges, snapshotId });

  return {
    snapshotId,
    nodes,
    edges,
    retrievalFingerprint: fingerprintRetrievalResult(retrievalResult),
    metricsFingerprint: canonicalFingerprint(metricsOutput.records),
  };
}

describe('snapshot evolution', { timeout: 60_000 }, () => {

  it('same seed produces same retrieval fingerprint', () => {
    const a = buildSnapshot('det', 50, 42, 3, 2);
    const b = buildSnapshot('det', 50, 42, 3, 2);
    expect(a.retrievalFingerprint).toBe(b.retrievalFingerprint);
    expect(a.metricsFingerprint).toBe(b.metricsFingerprint);
  });

  it('different node counts produce different fingerprints', () => {
    const small = buildSnapshot('diff-a', 10, 42, 2, 1);
    const large = buildSnapshot('diff-b', 100, 42, 2, 1);
    expect(small.retrievalFingerprint).not.toBe(large.retrievalFingerprint);
  });

  it('snapshot A -> B -> C: each has deterministic retrieval within itself', () => {
    const snapshots = [
      buildSnapshot('evol-A', 30, 100, 2, 1),
      buildSnapshot('evol-B', 40, 101, 3, 2),
      buildSnapshot('evol-C', 50, 102, 4, 3),
    ];

    for (const snap of snapshots) {
      const retrievalEngine = new RetrievalEngine();
      const input = {
        nodes: snap.nodes.map((n) => ({
          id: n.id, filePath: n.filePath, fileHash: n.fileHash,
          nodeType: n.nodeType, symbolName: n.symbolName, language: n.language, metadataJson: n.metadataJson,
        })),
        edges: snap.edges.map((e) => ({
          id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
          edgeType: e.edgeType, weight: e.weight, metadataJson: e.metadataJson,
        })),
        snapshotId: snap.snapshotId,
      };
      const seedIds = snap.nodes.length > 0 ? [snap.nodes[0]!.id] : [];
      const fp1 = fingerprintRetrievalResult(retrievalEngine.retrieve(input, {
        snapshotId: snap.snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds: seedIds,
        maxDepth: 3,
        maxResults: 50,
        ordering: RetrievalOrdering.DETERMINISTIC,
      }));
      const fp2 = fingerprintRetrievalResult(retrievalEngine.retrieve(input, {
        snapshotId: snap.snapshotId,
        strategy: RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD,
        scope: RetrievalScope.NODE,
        seedNodeIds: seedIds,
        maxDepth: 3,
        maxResults: 50,
        ordering: RetrievalOrdering.DETERMINISTIC,
      }));
      expect(fp1).toBe(fp2);
    }
  });

  it('graph structure evolves across snapshots', () => {
    const snapA = buildSnapshot('struct-A', 10, 200, 2, 1);
    const snapB = buildSnapshot('struct-B', 20, 201, 2, 1);
    expect(snapA.nodes.length).toBeLessThan(snapB.nodes.length);
    expect(snapA.retrievalFingerprint).not.toBe(snapB.retrievalFingerprint);
  });

  it('snapshot isolation: separate snapshots have distinct content', () => {
    const snapA = buildSnapshot('iso-A', 25, 300, 2, 1);
    const snapB = buildSnapshot('iso-B', 25, 301, 2, 1);
    expect(snapA.retrievalFingerprint).not.toBe(snapB.retrievalFingerprint);
  });

  it('validation engine behaves consistently across evolved snapshots', () => {
    const snapA = buildSnapshot('val-A', 30, 600, 2, 1);
    const snapB = buildSnapshot('val-B', 30, 601, 2, 1);

    const engine = new IntegrityEngine();
    const validateSnapshot = (snap: SnapshotState) => {
      return engine.validate({
        snapshotId: snap.snapshotId,
        nodes: snap.nodes,
        edges: snap.edges,
        retrievalAvailable: true,
      });
    };

    const resultA = validateSnapshot(snapA);
    const resultB = validateSnapshot(snapB);

    expect(resultA.isValid).toBe(true);
    expect(resultB.isValid).toBe(true);
    expect(resultA.integrityMetrics.integrityScore).toBeGreaterThanOrEqual(0);
    expect(resultB.integrityMetrics.integrityScore).toBeGreaterThanOrEqual(0);
  });
});
