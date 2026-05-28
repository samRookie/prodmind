import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { ArchitectureDiffRepository } from '../../repositories/architecture-diff.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS architecture_diffs (id TEXT PRIMARY KEY, previous_snapshot_id TEXT NOT NULL REFERENCES snapshots(id), current_snapshot_id TEXT NOT NULL REFERENCES snapshots(id), diff_type TEXT NOT NULL, severity TEXT NOT NULL, fingerprint TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const sql of stmts) { await client.execute(sql); }
}

async function seedTwoSnapshots(client: Client): Promise<{ projectId: string; prevSnapshotId: string; currSnapshotId: string }> {
  const projectId = generateId(); const prevSnapshotId = generateId(); const currSnapshotId = generateId(); const nowStr = now();
  await client.execute({ sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [projectId, 'Test', null, 'ACTIVE', nowStr, nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [prevSnapshotId, projectId, 1, 'ACTIVE', nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [currSnapshotId, projectId, 2, 'ACTIVE', nowStr] });
  return { projectId, prevSnapshotId, currSnapshotId };
}

describe('ArchitectureDiffRepository', () => {
  let client: Client; let db: Database; let repo: ArchitectureDiffRepository;
  let prevSnapshotId: string; let currSnapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-ad-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL'); await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedTwoSnapshots(client);
    prevSnapshotId = seed.prevSnapshotId; currSnapshotId = seed.currSnapshotId;
    repo = new ArchitectureDiffRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries diffs by current snapshot', async () => {
    const result = await repo.insert([{ previousSnapshotId: prevSnapshotId, currentSnapshotId: currSnapshotId, diffType: 'NODE_ADDED', severity: 'MODERATE', fingerprint: 'fp-d1', metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    const diffs = await repo.queryByCurrentSnapshot(currSnapshotId);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('queries by severity', async () => {
    const diffs = await repo.queryBySeverity('MODERATE');
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('queries by snapshot pair', async () => {
    const diffs = await repo.queryBySnapshotPair(prevSnapshotId, currSnapshotId);
    expect(diffs.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const diff = await repo.queryByFingerprint('fp-d1');
    expect(diff).toBeDefined();
  });

  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(currSnapshotId);
    const diffs = await repo.queryByCurrentSnapshot(currSnapshotId);
    expect(diffs).toHaveLength(0);
  });
});
