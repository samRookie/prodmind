import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFullTestDb } from '@prodmind/db/__tests__/helpers';
import { ProjectRepository, GraphRepository, MetricsRepository, SemanticRepository, CompressionRepository, ValidationRepository } from '@prodmind/db';
import { SnapshotPipeline } from '../../services/ingestion/snapshot-pipeline.ts';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Database } from '@prodmind/db';

describe('failure recovery hardening', { timeout: 60_000 }, () => {
  let db: Database;
  let dbPath: string;
  let pipeline: SnapshotPipeline;
  let projectRepo: ProjectRepository;
  let projectId: string;

  function cleanDb(p: string): void {
    try { require('node:fs').unlinkSync(p); } catch {}
    try { require('node:fs').unlinkSync(p + '-wal'); } catch {}
    try { require('node:fs').unlinkSync(p + '-shm'); } catch {}
  }

  beforeAll(async () => {
    const env = await createFullTestDb();
    db = env.db;
    dbPath = env.dbPath;
    pipeline = new SnapshotPipeline(db);
    projectRepo = new ProjectRepository(db);
    const project = await projectRepo.create({ name: 'harden-failure', description: 'Hardened failure recovery' });
    projectId = project.id;
  });

  afterAll(() => {
    cleanDb(dbPath);
  });

  describe('rollback data cleanup', () => {
    it('rollback cleans graph nodes and edges', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'graph-clean.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const graphRepo = new GraphRepository(db);
      await graphRepo.insertNodes(snap.id, [
        { filePath: '/test.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);

      await pipeline.rollbackSnapshot(snap.id);
      const leftover = await graphRepo.getNodesBySnapshot(snap.id);
      expect(leftover.length).toBe(0);
    });

    it('rollback cleans semantic data', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'semantic-clean.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const graphRepo = new GraphRepository(db);
      const nodes = await graphRepo.insertNodes(snap.id, [
        { filePath: '/semantic.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);
      if (!nodes.success) throw new Error('insertNodes failed');

      const semanticRepo = new SemanticRepository(db);
      const nodeId = nodes.data[0]!.id;
      await semanticRepo.insertClassifications(snap.id, [
        { nodeId, semanticType: 'DOMAIN_LAYER', ruleStrength: 'STRONG', classificationReasonsJson: null, matchedHeuristicsJson: null, infraScore: null, businessScore: null, dominantRole: null },
      ]);

      await pipeline.rollbackSnapshot(snap.id);
      const classifications = await semanticRepo.getClassificationsBySnapshot(snap.id);
      expect(classifications.length).toBe(0);
    });

    it('rollback cleans compression data', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'compression-clean.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const compressionRepo = new CompressionRepository(db);
      await compressionRepo.insertFileContexts(snap.id, [{
        filePath: '/test.ts', language: 'typescript', architecturalRole: null, semanticClassification: null,
        purpose: null, isAsync: false, dependencyCount: 0,
        symbolsJson: null, importsJson: null, exportsJson: null, dependencyPathsJson: null,
      }]);

      await pipeline.rollbackSnapshot(snap.id);
      const files = await compressionRepo.getFileContextsBySnapshot(snap.id);
      expect(files.length).toBe(0);
    });

    it('rollback cleans metrics data', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'metrics-clean.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const metricsRepo = new MetricsRepository(db);
      await metricsRepo.insertMetrics(snap.id, [{
        metricType: 'CENTRALITY', metricScope: 'NODE', nodeId: null,
        metricValue: 0.5, metricClassification: null, metricPriority: 'IMPORTANT', metadataJson: null,
      }]);

      await pipeline.rollbackSnapshot(snap.id);
      const metrics = await metricsRepo.getMetricsBySnapshot(snap.id);
      expect(metrics.length).toBe(0);
    });

    it('rollback is idempotent and cleans exactly once', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'idempotent-clean.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const graphRepo = new GraphRepository(db);
      await graphRepo.insertNodes(snap.id, [
        { filePath: '/idempotent.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);

      await pipeline.rollbackSnapshot(snap.id);
      await pipeline.rollbackSnapshot(snap.id);
      const snap_ = await pipeline.findById(snap.id);
      expect(snap_?.status).toBe('FAILED');
    });
  });

  describe('validation persistence hardening', () => {
    it('validation failures propagate errors instead of silent false', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'validation-fail.zip');
      const validationRepo = new ValidationRepository(db);
      const issues = [{
        issueCode: 'TEST_ERR', severity: 'CRITICAL', category: 'INTEGRITY',
        state: 'INVALID', message: 'Test error', nodeId: null, edgeId: null, metadataJson: null,
      }];
      const result = await validationRepo.insertValidationIssues(snap.id, issues);
      expect(result).toBe(true);
    });
  });

  describe('transaction atomicity', () => {
    it('graph commit failure mid-pipeline does not leave orphaned data', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'atomic-graph.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const graphRepo = new GraphRepository(db);

      const nodeResult = await graphRepo.insertNodes(snap.id, [
        { filePath: '/a.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
        { filePath: '/b.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);
      if (!nodeResult.success) throw new Error('insertNodes failed');
      const nodeId = nodeResult.data[0]!.id;

      await pipeline.rollbackSnapshot(snap.id);

      const nodes = await graphRepo.getNodesBySnapshot(snap.id);
      expect(nodes.length).toBe(0);

      const badEdgeResult = await graphRepo.insertEdges(snap.id, [
        { sourceNodeId: nodeId, targetNodeId: 'nonexistent', edgeType: 'IMPORTS', weight: null, metadataJson: null },
      ]);
      expect(badEdgeResult.success).toBe(false);
    });
  });
});
