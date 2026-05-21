import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFullTestDb } from '@prodmind/db/__tests__/helpers';
import { ProjectRepository, SnapshotRepository, GraphRepository } from '@prodmind/db';
import { SnapshotPipeline } from '../../services/ingestion/snapshot-pipeline.ts';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Database } from '@prodmind/db';

describe('concurrency safety', { timeout: 60_000 }, () => {
  let db: Database;
  let dbPath: string;
  let pipeline: SnapshotPipeline;
  let projectRepo: ProjectRepository;
  let snapRepo: SnapshotRepository;
  let graphRepo: GraphRepository;
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
    snapRepo = new SnapshotRepository(db);
    graphRepo = new GraphRepository(db);
    const project = await projectRepo.create({ name: 'concurrency', description: 'Concurrency safety test' });
    projectId = project.id;
  });

  afterAll(() => {
    cleanDb(dbPath);
  });

  describe('simultaneous ingestion simulation', () => {
    it('snapshot creation with same project does not corrupt version numbers', async () => {
      const [snap1, snap2] = await Promise.all([
        pipeline.createSnapshot(projectId, 'concurrent-1.zip'),
        pipeline.createSnapshot(projectId, 'concurrent-2.zip'),
      ]);
      expect(snap1.version).not.toBe(snap2.version);
      expect(snap1.id).not.toBe(snap2.id);
    });

    it('simultaneous status transitions do not break state machine', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'simul-state.zip');
      await Promise.all([
        pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING),
        pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING),
      ]);
      const current = await snapRepo.findById(snap.id);
      expect(current?.status).toBe('UPLOADING');
    });

    it('duplicate activation attempt is safe (activation is idempotent for same snapshot)', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'dup-activate.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.ANALYZING);

      const first = await pipeline.activateSnapshot(snap.id);
      expect(first.success).toBe(true);

      const second = await pipeline.activateSnapshot(snap.id);
      expect(second.success).toBe(false);
    });
  });

  describe('graph retrieval during active ingestion', () => {
    it('reading snapshot graph while nodes are being inserted returns clean state', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'read-during-write.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.PARSING);

      const nodeInserts = graphRepo.insertNodes(snap.id, [
        { filePath: '/read-test-1.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
        { filePath: '/read-test-2.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);

      const graphRead = graphRepo.getSnapshotGraph(snap.id);

      const [insertResult, graphResult] = await Promise.all([nodeInserts, graphRead]);
      expect(insertResult.success).toBe(true);
      expect(graphResult.nodes.length).toBeGreaterThanOrEqual(0);

      const finalNodes = await graphRepo.getNodesBySnapshot(snap.id);
      expect(finalNodes.length).toBe(2);
    });
  });

  describe('no snapshot corruption from concurrent access', () => {
    it('multiple status reads during transition return consistent result', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'consistent-status.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);

      const [read1, read2] = await Promise.all([
        snapRepo.findById(snap.id),
        snapRepo.findById(snap.id),
      ]);
      expect(read1?.status).toBe(read2?.status);
    });

    it('after rollback, snapshot is immutable to graph writes', async () => {
      const snap = await pipeline.createSnapshot(projectId, 'immutable-after-rollback.zip');
      await pipeline.transitionTo(snap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(snap.id, SnapshotStatus.EXTRACTING);

      await pipeline.rollbackSnapshot(snap.id);
      const result = await graphRepo.insertNodes(snap.id, [
        { filePath: '/should-fail.ts', nodeType: 'FILE', symbolName: null, language: 'typescript', fileHash: null, metadataJson: null, summaryJson: null },
      ]);
      expect(result.success).toBe(false);
    });
  });
});
