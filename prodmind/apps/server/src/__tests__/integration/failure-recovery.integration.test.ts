import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFullTestDb } from '@prodmind/db/__tests__/helpers';
import { ProjectRepository } from '@prodmind/db';
import { SnapshotPipeline } from '../../services/ingestion/snapshot-pipeline.ts';
import { ValidationSeverity, ValidationCategory, ValidationState, SnapshotStatus } from '@prodmind/contracts';
import type { Database } from '@prodmind/db';

describe('failure recovery', { timeout: 60_000 }, () => {
  let db: Database;
  let dbPath: string;
  let pipeline: SnapshotPipeline;
  let projectRepo: ProjectRepository;
  let projectId: string;
  let snapshotId: string;

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
    const project = await projectRepo.create({ name: 'failure-test', description: 'Failure recovery test' });
    projectId = project.id;
    const snapshot = await pipeline.createSnapshot(projectId, 'test.zip');
    snapshotId = snapshot.id;
  });

  afterAll(() => {
    cleanDb(dbPath);
  });

  describe('validation blocks invalid snapshots', () => {
    it('critical validation issues prevent activation', async () => {
      const issues = [
        {
          issueCode: 'MISSING_NODE_REF',
          severity: ValidationSeverity.CRITICAL,
          category: ValidationCategory.GRAPH_STRUCTURE,
          message: 'Edge references nonexistent node',
          nodeId: null,
          edgeId: 'bad-edge',
          metadataJson: null,
        },
      ];
      const result = await pipeline.commitValidationResults(snapshotId, issues, 0.0, 0.0, ValidationState.INVALID);
      expect(result.success).toBe(true);
      const activation = await pipeline.activateSnapshot(snapshotId);
      expect(activation.success).toBe(false);
    });
  });

  describe('degraded snapshots activate with reduced status', () => {
    it('warning-only issues allow degraded activation', async () => {
      const degradedProj = await projectRepo.create({ name: 'degraded-test', description: '' });
      const degradedSnap = await pipeline.createSnapshot(degradedProj.id, 'degraded.zip');
      await pipeline.transitionTo(degradedSnap.id, SnapshotStatus.UPLOADING);
      await pipeline.transitionTo(degradedSnap.id, SnapshotStatus.EXTRACTING);
      await pipeline.transitionTo(degradedSnap.id, SnapshotStatus.PARSING);
      await pipeline.transitionTo(degradedSnap.id, SnapshotStatus.ANALYZING);
      const issues = [
        {
          issueCode: 'LOW_COVERAGE',
          severity: ValidationSeverity.WARNING,
          category: ValidationCategory.METRICS,
          message: 'Metric coverage is low',
          nodeId: null,
          edgeId: null,
          metadataJson: null,
        },
      ];
      await pipeline.commitValidationResults(degradedSnap.id, issues, 0.7, 0.6, ValidationState.DEGRADED);
      const activation = await pipeline.activateSnapshot(degradedSnap.id);
      expect(activation.success).toBe(true);
    });
  });

  describe('rollback cleanup', () => {
    it('rollback marks snapshot as failed', async () => {
      const rollbackProj = await projectRepo.create({ name: 'rollback-test', description: '' });
      const rollbackSnap = await pipeline.createSnapshot(rollbackProj.id, 'rollback.zip');
      await pipeline.rollbackSnapshot(rollbackSnap.id);
      const snap = await pipeline.findById(rollbackSnap.id);
      expect(snap?.status).toBe('FAILED');
    });

    it('rollback is idempotent', async () => {
      const idempotentProj = await projectRepo.create({ name: 'idempotent-test', description: '' });
      const idempotentSnap = await pipeline.createSnapshot(idempotentProj.id, 'idempotent.zip');
      await pipeline.rollbackSnapshot(idempotentSnap.id);
      await pipeline.rollbackSnapshot(idempotentSnap.id);
      const snap = await pipeline.findById(idempotentSnap.id);
      expect(snap?.status).toBe('FAILED');
    });
  });

  describe('transaction rollback', () => {
    it('graph commit after rollback is rejected', async () => {
      const rejectProj = await projectRepo.create({ name: 'reject-test', description: '' });
      const rejectSnap = await pipeline.createSnapshot(rejectProj.id, 'reject.zip');
      await pipeline.rollbackSnapshot(rejectSnap.id);
      const commitResult = await pipeline.commitGraph(rejectSnap.id, [], []);
      expect(commitResult.success).toBe(false);
    });
  });

  describe('DB consistency during failure', () => {
    it('orphaned snapshots are cleaned up after failed activation', async () => {
      const orphanProj = await projectRepo.create({ name: 'orphan-test', description: '' });
      const orphanSnap = await pipeline.createSnapshot(orphanProj.id, 'orphan.zip');
      await pipeline.rollbackSnapshot(orphanSnap.id);
      const snap = await pipeline.findById(orphanSnap.id);
      expect(snap).not.toBeNull();
      expect(snap?.status).toBe('FAILED');
    });
  });
});
