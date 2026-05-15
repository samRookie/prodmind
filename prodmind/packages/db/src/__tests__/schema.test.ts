import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from '@libsql/client';
import * as fs from 'node:fs';
import { createFullTestDb } from './helpers.ts';

describe('Schema Integrity', () => {
  let client: Client;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    client = env.client;
    dbPath = env.dbPath;
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + '-wal'); } catch {}
    try { fs.unlinkSync(dbPath + '-shm'); } catch {}
  });

  async function tableExists(tableName: string): Promise<boolean> {
    const result = await client.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      args: [tableName],
    });
    return result.rows.length > 0;
  }

  async function tableHasColumn(tableName: string, columnName: string): Promise<boolean> {
    const result = await client.execute({
      sql: `SELECT name FROM pragma_table_info(?) WHERE name=?`,
      args: [tableName, columnName],
    });
    return result.rows.length > 0;
  }

  it('projects table exists with all columns', async () => {
    expect(await tableExists('projects')).toBe(true);
    expect(await tableHasColumn('projects', 'id')).toBe(true);
    expect(await tableHasColumn('projects', 'name')).toBe(true);
    expect(await tableHasColumn('projects', 'description')).toBe(true);
    expect(await tableHasColumn('projects', 'status')).toBe(true);
    expect(await tableHasColumn('projects', 'created_at')).toBe(true);
    expect(await tableHasColumn('projects', 'updated_at')).toBe(true);
    expect(await tableHasColumn('projects', 'active_snapshot_id')).toBe(true);
  });

  it('snapshots table exists with all columns', async () => {
    expect(await tableExists('snapshots')).toBe(true);
    expect(await tableHasColumn('snapshots', 'id')).toBe(true);
    expect(await tableHasColumn('snapshots', 'project_id')).toBe(true);
    expect(await tableHasColumn('snapshots', 'version')).toBe(true);
    expect(await tableHasColumn('snapshots', 'status')).toBe(true);
    expect(await tableHasColumn('snapshots', 'created_at')).toBe(true);
    expect(await tableHasColumn('snapshots', 'activated_at')).toBe(true);
    expect(await tableHasColumn('snapshots', 'is_degraded')).toBe(true);
  });

  it('nodes table exists', async () => {
    expect(await tableExists('nodes')).toBe(true);
    expect(await tableHasColumn('nodes', 'snapshot_id')).toBe(true);
    expect(await tableHasColumn('nodes', 'file_path')).toBe(true);
    expect(await tableHasColumn('nodes', 'node_type')).toBe(true);
  });

  it('edges table exists', async () => {
    expect(await tableExists('edges')).toBe(true);
    expect(await tableHasColumn('edges', 'source_node_id')).toBe(true);
    expect(await tableHasColumn('edges', 'target_node_id')).toBe(true);
    expect(await tableHasColumn('edges', 'edge_type')).toBe(true);
  });

  it('risks table exists', async () => {
    expect(await tableExists('risks')).toBe(true);
    expect(await tableHasColumn('risks', 'fingerprint')).toBe(true);
    expect(await tableHasColumn('risks', 'severity')).toBe(true);
  });

  it('insights table exists', async () => {
    expect(await tableExists('insights')).toBe(true);
    expect(await tableHasColumn('insights', 'content_json')).toBe(true);
  });

  it('event_logs table exists', async () => {
    expect(await tableExists('event_logs')).toBe(true);
    expect(await tableHasColumn('event_logs', 'event_type')).toBe(true);
  });

  it('job_queue table exists', async () => {
    expect(await tableExists('job_queue')).toBe(true);
    expect(await tableHasColumn('job_queue', 'job_type')).toBe(true);
    expect(await tableHasColumn('job_queue', 'priority')).toBe(true);
    expect(await tableHasColumn('job_queue', 'status')).toBe(true);
  });

  it('foreign key constraints work for snapshots.project_id', async () => {
    await expect(async () => {
      await client.execute({
        sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: ['s1', 'nonexistent-project', 1, 'PENDING', '2024-01-01T00:00:00Z'],
      });
    }).rejects.toThrow();
  });

  it('NOT NULL constraints work for projects.name', async () => {
    await expect(async () => {
      await client.execute({
        sql: `INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        args: ['p-bad', null, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'],
      });
    }).rejects.toThrow();
  });
});
