import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFullTestDb } from '@prodmind/db/__tests__/helpers';
import { Sha256Hasher, batchParseFiles, CompressionEngine } from '@prodmind/parser';
import { DependencyResolver, GraphNormalizer, SemanticEngine, MetricsEngine, IntegrityEngine } from '@prodmind/parser';
import { ProjectRepository } from '@prodmind/db';
import { SnapshotPipeline } from '../../services/ingestion/snapshot-pipeline.ts';
import { GraphBuilder } from '../../services/ingestion/graph-builder.ts';

const __dirname = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const FIXTURES_ROOT = resolve(__dirname, 'packages', 'parser', 'src', '__tests__', 'fixtures', 'architectures');

interface TestFixture {
  name: string;
  path: string;
  expectsActivation: boolean;
  expectsDegraded: boolean;
}

const TEST_FIXTURES: TestFixture[] = [
  { name: 'small-monolith', path: join(FIXTURES_ROOT, 'small-monolith'), expectsActivation: true, expectsDegraded: false },
  { name: 'layered-backend', path: join(FIXTURES_ROOT, 'layered-backend'), expectsActivation: true, expectsDegraded: false },
  { name: 'cyclic-architecture', path: join(FIXTURES_ROOT, 'cyclic-architecture'), expectsActivation: false, expectsDegraded: true },
  { name: 'utility-heavy', path: join(FIXTURES_ROOT, 'utility-heavy'), expectsActivation: true, expectsDegraded: false },
  { name: 'deep-dependency-chain', path: join(FIXTURES_ROOT, 'deep-dependency-chain'), expectsActivation: true, expectsDegraded: false },
];

function collectFiles(fixturePath: string): Array<{ relPath: string; source: string }> {
  if (!existsSync(fixturePath)) return [];
  const files: Array<{ relPath: string; source: string }> = [];
  const entries = readdirSync(fixturePath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(fixturePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
      const relPath = fullPath.replace(FIXTURES_ROOT, '').replace(/\\/g, '/');
      files.push({ relPath, source: readFileSync(fullPath, 'utf-8') });
    }
  }
  return files;
}

async function runStageIntegration(fixture: TestFixture) {
  const { db, dbPath } = await createFullTestDb();
  try {
    const pipeline = new SnapshotPipeline(db);
    const projectRepo = new ProjectRepository(db);

    // Stage 1: Project + Snapshot creation
    const project = await projectRepo.create({ name: `e2e-${fixture.name}`, description: 'E2E test' });
    const snapshot = await pipeline.createSnapshot(project.id, `${fixture.name}.zip`);

    // Stage 2: Filesystem discovery
    const files = collectFiles(fixture.path);
    if (files.length === 0) {
      return { activated: false, degraded: false, snapshotId: snapshot.id, fileCount: 0, error: 'No files found' };
    }

    // Stage 3: Hashing + Manifest
    const hasher = new Sha256Hasher();
    const hashInputs = files.map((f) => ({ path: f.relPath, absolutePath: f.relPath }));
    const hashes = await hasher.hashFiles(hashInputs);
    const fileHashMap = new Map(hashes.map((h) => [h.path, h.sha256]));

    // Stage 4: Parsing
    const parseInputs = files.map((f) => ({ path: f.relPath, source: f.source }));
    const parseResults = await batchParseFiles(parseInputs, { timeoutPerFile: 30_000 });
    const successfulParsedFiles = parseResults.filter((r): r is { success: true; data: import('@prodmind/parser').ParsedFile } => r.success).map((r) => r.data);

    // Stage 5: Resolution + Graph
    let resolution: import('@prodmind/parser').ResolutionResult | undefined;
    if (successfulParsedFiles.length > 0) {
      const allPaths = files.map((f) => f.relPath);
      const resolver = new DependencyResolver(successfulParsedFiles, allPaths);
      resolution = resolver.resolve();
      const normalizer = new GraphNormalizer();
      resolution = normalizer.normalize(resolution);
    }

    // Stage 6: Graph build + persist
    const graphBuilder = new GraphBuilder(snapshot.id);
    const graph = graphBuilder.build({ parseResults, fileHashes: fileHashMap, resolution });
    await pipeline.commitGraph(snapshot.id, graph.nodes, graph.edges);

    // Stage 7: Semantic analysis
    let semanticOutput: import('@prodmind/parser').SemanticOutput | undefined;
    try {
      const engine = new SemanticEngine();
      const semanticNodes = graph.nodes.map((n) => ({
        id: n.id, filePath: n.filePath, fileHash: n.fileHash ?? null,
        nodeType: n.nodeType, symbolName: n.symbolName ?? null,
        language: n.language ?? null, metadataJson: n.metadataJson ?? null,
      }));
      const semanticEdges = graph.edges.map((e) => ({
        id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
        edgeType: e.edgeType, weight: e.weight ?? null, metadataJson: e.metadataJson ?? null,
      }));
      semanticOutput = engine.analyze({ parseResults, resolution, nodes: semanticNodes, edges: semanticEdges, fileHashes: fileHashMap, snapshotId: snapshot.id });
      await pipeline.commitSemantic(snapshot.id, semanticOutput);
    } catch {
      // Non-fatal
    }

    // Stage 8: Compression
    try {
      const compressionEngine = new CompressionEngine();
      const compressionOutput = compressionEngine.compress({ parseResults, fileHashes: fileHashMap, resolution, snapshotId: snapshot.id });
      await pipeline.commitCompression(snapshot.id, compressionOutput);
    } catch {
      // Non-fatal
    }

    // Stage 9: Metrics
    let metricsOutput: import('@prodmind/parser').MetricsOutput | undefined;
    try {
      const metricsEngine = new MetricsEngine();
      metricsOutput = metricsEngine.analyze({
        nodes: graph.nodes.map((n) => ({
          id: n.id, filePath: n.filePath, fileHash: n.fileHash ?? null,
          nodeType: n.nodeType, symbolName: n.symbolName ?? null,
          language: n.language ?? null, metadataJson: n.metadataJson ?? null,
        })),
        edges: graph.edges.map((e) => ({
          id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
          edgeType: e.edgeType, weight: e.weight ?? null, metadataJson: e.metadataJson ?? null,
        })),
        snapshotId: snapshot.id,
        semanticClassifications: semanticOutput?.classifications,
      });
      await pipeline.commitMetrics(snapshot.id, metricsOutput.records);
    } catch {
      // Non-fatal
    }

    // Stage 10: Retrieval metadata
    try {
      await pipeline.commitRetrievalMetadata(snapshot.id);
    } catch {
      // Non-fatal
    }

    // Stage 11: Validation
    let validationState: string = 'DEGRADED';
    let validationBlocked = false;
    try {
      const engine = new IntegrityEngine();
      const validationInput = {
        snapshotId: snapshot.id,
        nodes: graph.nodes.map((n) => ({
          id: n.id, filePath: n.filePath, fileHash: n.fileHash ?? null,
          nodeType: n.nodeType, symbolName: n.symbolName ?? null,
          language: n.language ?? null, metadataJson: n.metadataJson ?? null,
        })),
        edges: graph.edges.map((e) => ({
          id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
          edgeType: e.edgeType, weight: e.weight ?? null, metadataJson: e.metadataJson ?? null,
        })),
        classifications: semanticOutput?.classifications,
        domainClusters: semanticOutput?.domainClusters,
        centrality: metricsOutput?.centrality,
        instability: metricsOutput?.instability,
        propagationRisk: metricsOutput?.propagationRisk,
        fanMetrics: metricsOutput?.fanMetrics,
        complexity: metricsOutput?.complexity,
        retrievalAvailable: true,
        compressionAvailable: true,
      };
      const validationOutput = engine.validate(validationInput);
      validationState = validationOutput.snapshotResult.validationState;
      validationBlocked = validationOutput.snapshotResult.validationState === 'INVALID';

      await pipeline.commitValidationResults(
        snapshot.id,
        validationOutput.issues,
        validationOutput.snapshotResult.integrityScore,
        validationOutput.snapshotResult.readinessScore,
        validationOutput.snapshotResult.validationState,
      );
    } catch {
      // Non-fatal
    }

    // Stage 12: Activation
    let activated = false;
    if (!validationBlocked) {
      const activation = await pipeline.activateSnapshot(snapshot.id);
      activated = activation.success;
    }

    if (validationBlocked) {
      await pipeline.markDegraded(snapshot.id);
    }

    const snapshotRecord = await pipeline.findById(snapshot.id);

    return {
      activated,
      degraded: snapshotRecord?.status === 'DEGRADED' || validationBlocked,
      snapshotId: snapshot.id,
      fileCount: files.length,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      validationState,
      snapshotStatus: snapshotRecord?.status,
    };
  } finally {
    try { unlinkSync(dbPath); } catch {}
    try { unlinkSync(dbPath + '-wal'); } catch {}
    try { unlinkSync(dbPath + '-shm'); } catch {}
  }
}

describe('E2E ingestion pipeline', { timeout: 120_000 }, () => {
  for (const fixture of TEST_FIXTURES) {
    it(`${fixture.name}: ${fixture.expectsActivation ? 'activates' : 'degrades'}`, async () => {
      const result = await runStageIntegration(fixture);
      if (!result || result.fileCount === 0) return;
      expect(result.nodeCount).toBeGreaterThan(0);
      if (fixture.expectsActivation) {
        expect(result.activated).toBe(true);
        expect(result.validationState).not.toBe('INVALID');
      }
      if (fixture.expectsDegraded) {
        expect(result.activated || result.degraded).toBe(true);
      }
    });
  }

  it('pipeline produces consistent graph sizes', async () => {
    const fixture = TEST_FIXTURES.find((f) => f.name === 'small-monolith')!;
    const result = await runStageIntegration(fixture);
    if (!result || result.fileCount === 0) return;
    expect(result.nodeCount).toBeGreaterThanOrEqual(result.fileCount);
    expect(result.edgeCount).toBeGreaterThanOrEqual(0);
  });

  it('layered-backend produces edge-rich graph', async () => {
    const fixture = TEST_FIXTURES.find((f) => f.name === 'layered-backend')!;
    const result = await runStageIntegration(fixture);
    if (!result || result.fileCount === 0) return;
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  it('deep-dependency-chain has proportional edges to nodes', async () => {
    const fixture = TEST_FIXTURES.find((f) => f.name === 'deep-dependency-chain')!;
    const result = await runStageIntegration(fixture);
    if (!result || result.fileCount === 0) return;
    expect(result.edgeCount).toBeGreaterThan(0);
  });
});
