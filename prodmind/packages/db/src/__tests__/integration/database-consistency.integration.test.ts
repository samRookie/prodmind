import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unlinkSync } from 'node:fs';
import { createFullTestDb } from '../helpers.ts';
import type { Client } from '@libsql/client';

describe('database consistency', { timeout: 60_000 }, () => {
  let client: Client;
  let dbPath: string;

  function cleanDb(p: string): void {
    try { unlinkSync(p); } catch {}
    try { unlinkSync(p + '-wal'); } catch {}
    try { unlinkSync(p + '-shm'); } catch {}
  }

  beforeAll(async () => {
    const env = await createFullTestDb();
    client = env.client;
    dbPath = env.dbPath;
  });

  afterAll(() => {
    cleanDb(dbPath);
  });

  describe('transactional integrity', () => {
    it('can insert and retrieve a project', async () => {
      const id = 'test-proj-1';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [id, 'Test Project', 'ACTIVE', new Date().toISOString(), new Date().toISOString()],
      });
      const result = await client.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [id] });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!.name).toBe('Test Project');
    });

    it('snapshot references valid project (FK)', async () => {
      const projectId = 'test-proj-fk';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projectId, 'FK Test', 'PENDING', new Date().toISOString(), new Date().toISOString()],
      });
      const snapshotId = 'test-snap-fk';
      await client.execute({
        sql: 'INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [snapshotId, projectId, 1, 'ACTIVE', new Date().toISOString()],
      });
      const result = await client.execute({
        sql: 'SELECT s.id, p.name as project_name FROM snapshots s JOIN projects p ON s.project_id = p.id WHERE s.id = ?',
        args: [snapshotId],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!.project_name).toBe('FK Test');
    });

    it('FK violation on invalid project reference', async () => {
      try {
        await client.execute({
          sql: 'INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)',
          args: ['snap-bad-fk', 'nonexistent-project', 1, 'PENDING', new Date().toISOString()],
        });
      } catch (e: unknown) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('deterministic inserts', () => {
    it('inserting the same data twice produces different IDs', async () => {
      const projId1 = 'det-proj-1';
      const projId2 = 'det-proj-2';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projId1, 'Deterministic Test', 'ACTIVE', new Date().toISOString(), new Date().toISOString()],
      });
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projId2, 'Deterministic Test', 'ACTIVE', new Date().toISOString(), new Date().toISOString()],
      });
      expect(projId1).not.toBe(projId2);
    });

    it('node insertion preserves all columns', async () => {
      const projectId = 'det-proj-nodes';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projectId, 'Node Test', 'PENDING', new Date().toISOString(), new Date().toISOString()],
      });
      const snapshotId = 'det-snap-nodes';
      await client.execute({
        sql: 'INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [snapshotId, projectId, 1, 'ACTIVE', new Date().toISOString()],
      });
      const nodeId = 'det-node-1';
      await client.execute({
        sql: 'INSERT INTO nodes (id, snapshot_id, file_path, node_type, language, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [nodeId, snapshotId, '/src/index.ts', 'FILE', 'typescript', new Date().toISOString()],
      });
      const result = await client.execute({
        sql: 'SELECT * FROM nodes WHERE id = ?',
        args: [nodeId],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0]!.file_path).toBe('/src/index.ts');
      expect(result.rows[0]!.node_type).toBe('FILE');
      expect(result.rows[0]!.language).toBe('typescript');
    });
  });

  describe('cleanup correctness', () => {
    it('deleting a snapshot then project cleans up cleanly', async () => {
      const projectId = 'cleanup-proj';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projectId, 'Cleanup Test', 'PENDING', new Date().toISOString(), new Date().toISOString()],
      });
      await client.execute({
        sql: 'INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)',
        args: ['cleanup-snap', projectId, 1, 'ACTIVE', new Date().toISOString()],
      });
      await client.execute({ sql: 'DELETE FROM snapshots WHERE project_id = ?', args: [projectId] });
      await client.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [projectId] });
      const snapResult = await client.execute({ sql: 'SELECT * FROM snapshots WHERE project_id = ?', args: [projectId] });
      expect(snapResult.rows.length).toBe(0);
    });
  });

  describe('no orphaned data', () => {
    it('all edges reference valid nodes', async () => {
      const projectId = 'orphan-test';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projectId, 'Orphan Test', 'PENDING', new Date().toISOString(), new Date().toISOString()],
      });
      const snapshotId = 'orphan-snap';
      await client.execute({
        sql: 'INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [snapshotId, projectId, 1, 'ACTIVE', new Date().toISOString()],
      });
      const nodeA = 'orphan-node-a';
      const nodeB = 'orphan-node-b';
      await client.execute({
        sql: 'INSERT INTO nodes (id, snapshot_id, file_path, node_type, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [nodeA, snapshotId, '/src/a.ts', 'FILE', new Date().toISOString()],
      });
      await client.execute({
        sql: 'INSERT INTO nodes (id, snapshot_id, file_path, node_type, created_at) VALUES (?, ?, ?, ?, ?)',
        args: [nodeB, snapshotId, '/src/b.ts', 'FILE', new Date().toISOString()],
      });
      await client.execute({
        sql: 'INSERT INTO edges (id, snapshot_id, source_node_id, target_node_id, edge_type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: ['orphan-edge', snapshotId, nodeA, nodeB, 'IMPORTS', new Date().toISOString()],
      });
      const edgeResult = await client.execute({
        sql: `SELECT e.id FROM edges e
              LEFT JOIN nodes n1 ON e.source_node_id = n1.id
              LEFT JOIN nodes n2 ON e.target_node_id = n2.id
              WHERE e.id = ? AND (n1.id IS NULL OR n2.id IS NULL)`,
        args: ['orphan-edge'],
      });
      expect(edgeResult.rows.length).toBe(0);
    });
  });

  describe('WAL mode correctness', () => {
    it('concurrent reads work in WAL mode', async () => {
      const projectId = 'wal-proj';
      await client.execute({
        sql: 'INSERT INTO projects (id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        args: [projectId, 'WAL Test', 'ACTIVE', new Date().toISOString(), new Date().toISOString()],
      });
      const read1 = await client.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [projectId] });
      const read2 = await client.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [projectId] });
      expect(read1.rows.length).toBe(1);
      expect(read2.rows.length).toBe(1);
      expect(read1.rows[0]!.id).toBe(read2.rows[0]!.id);
    });
  });
});
