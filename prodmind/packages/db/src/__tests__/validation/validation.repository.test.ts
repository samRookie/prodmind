import { describe, it, expect } from 'vitest';
import { unlinkSync } from 'node:fs';
import { ValidationRepository } from '../../repositories/validation.repository.ts';
import { generateId, now } from '../../utils.ts';
import type { Database } from '../../client.ts';
import { createFullTestDb } from '../helpers.ts';
import { projects } from '../../schema/projects.ts';
import { snapshots } from '../../schema/snapshots.ts';

async function makeTestDb(): Promise<{ db: Database; cleanup: () => void }> {
  const { db, client, dbPath } = await createFullTestDb();
  return {
    db,
    cleanup: () => {
      client.close();
      try { unlinkSync(dbPath); } catch {}
      try { unlinkSync(dbPath + '-wal'); } catch {}
      try { unlinkSync(dbPath + '-shm'); } catch {}
    },
  };
}

async function seedSnapshot(db: Database): Promise<string> {
  const projectId = generateId();
  const snapshotId = generateId();
  const timestamp = now();
  await db.insert(projects).values({ id: projectId, name: 'test', createdAt: timestamp, updatedAt: timestamp });
  await db.insert(snapshots).values({ id: snapshotId, projectId, version: 1, status: 'PENDING', createdAt: timestamp });
  return snapshotId;
}

describe('ValidationRepository', () => {
  it('insertValidationIssues inserts and retrieves issues', async () => {
    const { db, cleanup } = await makeTestDb();
    try {
      const snapshotId = await seedSnapshot(db);
      const repo = new ValidationRepository(db);

      const success = await repo.insertValidationIssues(snapshotId, [
        { category: 'GRAPH_STRUCTURE', severity: 'CRITICAL', state: 'INVALID', issueCode: 'NODE_REF_MISSING', message: 'Missing node', nodeId: 'n1', edgeId: null, metadataJson: null },
      ]);
      expect(success).toBe(true);

      const issues = await repo.getValidationIssues(snapshotId);
      expect(issues.length).toBe(1);
      expect(issues[0]!.issueCode).toBe('NODE_REF_MISSING');
    } finally {
      cleanup();
    }
  });

  it('insertSnapshotIntegrity stores integrity data', async () => {
    const { db, cleanup } = await makeTestDb();
    try {
      const snapshotId = await seedSnapshot(db);
      const repo = new ValidationRepository(db);

      const success = await repo.insertSnapshotIntegrity(snapshotId, {
        integrityScore: 0.85,
        readinessScore: 0.9,
        validationState: 'DEGRADED',
        criticalIssueCount: 1,
        warningCount: 2,
        metadataJson: null,
      });
      expect(success).toBe(true);

      const integrity = await repo.getSnapshotIntegrity(snapshotId);
      expect(integrity).not.toBeNull();
      expect(integrity!.integrityScore).toBe(0.85);
      expect(integrity!.validationState).toBe('DEGRADED');
    } finally {
      cleanup();
    }
  });

  it('getCriticalIssues returns only critical issues', async () => {
    const { db, cleanup } = await makeTestDb();
    try {
      const snapshotId = await seedSnapshot(db);
      const repo = new ValidationRepository(db);

      await repo.insertValidationIssues(snapshotId, [
        { category: 'GRAPH_STRUCTURE', severity: 'CRITICAL', state: 'INVALID', issueCode: 'C1', message: 'Critical', nodeId: null, edgeId: null, metadataJson: null },
        { category: 'GRAPH_STRUCTURE', severity: 'WARNING', state: 'DEGRADED', issueCode: 'W1', message: 'Warning', nodeId: null, edgeId: null, metadataJson: null },
      ]);

      const critical = await repo.getCriticalIssues(snapshotId);
      expect(critical.length).toBe(1);
      expect(critical[0]!.issueCode).toBe('C1');
    } finally {
      cleanup();
    }
  });

  it('deleteSnapshotValidation removes all validation data', async () => {
    const { db, cleanup } = await makeTestDb();
    try {
      const snapshotId = await seedSnapshot(db);
      const repo = new ValidationRepository(db);

      await repo.insertValidationIssues(snapshotId, [
        { category: 'GRAPH_STRUCTURE', severity: 'WARNING', state: 'DEGRADED', issueCode: 'W1', message: 'Warning', nodeId: null, edgeId: null, metadataJson: null },
      ]);
      await repo.insertSnapshotIntegrity(snapshotId, {
        integrityScore: 1, readinessScore: 1, validationState: 'VALID', criticalIssueCount: 0, warningCount: 0, metadataJson: null,
      });

      await repo.deleteSnapshotValidation(snapshotId);

      const issues = await repo.getValidationIssues(snapshotId);
      const integrity = await repo.getSnapshotIntegrity(snapshotId);
      expect(issues.length).toBe(0);
      expect(integrity).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('getValidationSummary aggregates correctly', async () => {
    const { db, cleanup } = await makeTestDb();
    try {
      const snapshotId = await seedSnapshot(db);
      const repo = new ValidationRepository(db);

      await repo.insertValidationIssues(snapshotId, [
        { category: 'GRAPH_STRUCTURE', severity: 'CRITICAL', state: 'INVALID', issueCode: 'C1', message: 'C', nodeId: null, edgeId: null, metadataJson: null },
        { category: 'GRAPH_STRUCTURE', severity: 'WARNING', state: 'DEGRADED', issueCode: 'W1', message: 'W', nodeId: null, edgeId: null, metadataJson: null },
        { category: 'SEMANTIC', severity: 'INFO', state: 'VALID', issueCode: 'I1', message: 'I', nodeId: null, edgeId: null, metadataJson: null },
      ]);

      const summary = await repo.getValidationSummary(snapshotId);
      expect(summary.totalIssues).toBe(3);
      expect(summary.criticalCount).toBe(1);
      expect(summary.warningCount).toBe(1);
      expect(summary.infoCount).toBe(1);
    } finally {
      cleanup();
    }
  });
});
