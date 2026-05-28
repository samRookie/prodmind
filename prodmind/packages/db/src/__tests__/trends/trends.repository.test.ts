import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { TrendsRepository } from '../../repositories/trends.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS architecture_trends (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), trend_type TEXT NOT NULL, direction TEXT NOT NULL, severity TEXT NOT NULL, normalized_severity REAL NOT NULL, growth_rate REAL NOT NULL, fingerprint TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const sql of stmts) { await client.execute(sql); }
}

async function seedProjectSnapshot(client: Client): Promise<{ projectId: string; snapshotId: string }> {
  const projectId = generateId(); const snapshotId = generateId(); const nowStr = now();
  await client.execute({ sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [projectId, 'Test', null, 'ACTIVE', nowStr, nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [snapshotId, projectId, 1, 'ACTIVE', nowStr] });
  return { projectId, snapshotId };
}

describe('TrendsRepository', () => {
  let client: Client; let db: Database; let repo: TrendsRepository; let snapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-tr-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL'); await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedProjectSnapshot(client);
    snapshotId = seed.snapshotId;
    repo = new TrendsRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries trends by snapshot', async () => {
    const result = await repo.insert([{ snapshotId, trendType: 'COMPLEXITY_GROWTH', direction: 'DEGRADING', severity: 'HIGH', normalizedSeverity: 0.6, growthRate: 0.3, fingerprint: 'fp-tr1', metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    const trends = await repo.queryBySnapshot(snapshotId);
    expect(trends.length).toBeGreaterThan(0);
  });

  it('queries by trend type', async () => {
    const trends = await repo.queryByTrendType('COMPLEXITY_GROWTH');
    expect(trends.length).toBeGreaterThan(0);
  });

  it('queries by severity', async () => {
    const trends = await repo.queryBySeverity('HIGH');
    expect(trends.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const trend = await repo.queryByFingerprint('fp-tr1');
    expect(trend).toBeDefined();
  });

  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    const trends = await repo.queryBySnapshot(snapshotId);
    expect(trends).toHaveLength(0);
  });
});
