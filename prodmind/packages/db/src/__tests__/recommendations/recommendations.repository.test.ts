import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { RecommendationsRepository } from '../../repositories/recommendations.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS recommendations (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), category TEXT NOT NULL, severity TEXT NOT NULL, priority TEXT NOT NULL, priority_score REAL NOT NULL, fingerprint TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, rationale TEXT, impacted_nodes_json TEXT, remediation_json TEXT, metadata_json TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const sql of stmts) { await client.execute(sql); }
}

async function seedProjectSnapshot(client: Client): Promise<{ projectId: string; snapshotId: string }> {
  const projectId = generateId();
  const snapshotId = generateId();
  const nowStr = now();
  await client.execute({ sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [projectId, 'Test Project', null, 'ACTIVE', nowStr, nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [snapshotId, projectId, 1, 'ACTIVE', nowStr] });
  return { projectId, snapshotId };
}

describe('RecommendationsRepository', () => {
  let client: Client; let db: Database; let repo: RecommendationsRepository; let snapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-rec-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedProjectSnapshot(client);
    snapshotId = seed.snapshotId;
    repo = new RecommendationsRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries recommendations by snapshot', async () => {
    const result = await repo.insert([{ snapshotId, category: 'STABILITY', severity: 'HIGH', priority: 'HIGH', priorityScore: 0.75, fingerprint: 'fp-rec-1', title: 'Fix stability', summary: 'Stability fix', rationale: null, impactedNodesJson: null, remediationJson: null, metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.category).toBe('STABILITY');
    }
    const recs = await repo.queryBySnapshot(snapshotId);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('inserts and queries by severity', async () => {
    await repo.insert([{ snapshotId, category: 'DECOUPLING', severity: 'CRITICAL', priority: 'IMMEDIATE', priorityScore: 0.9, fingerprint: 'fp-rec-2', title: 'Decouple', summary: 'Decouple modules', rationale: null, impactedNodesJson: null, remediationJson: null, metadataJson: null }]);
    const recs = await repo.queryBySeverity('CRITICAL');
    expect(recs.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const rec = await repo.queryByFingerprint('fp-rec-1');
    expect(rec).toBeDefined();
    expect(rec!.title).toBe('Fix stability');
  });

  it('deletes by snapshot', async () => {
    const result = await repo.deleteBySnapshot(snapshotId);
    expect(result.success).toBe(true);
    const recs = await repo.queryBySnapshot(snapshotId);
    expect(recs).toHaveLength(0);
  });

  it('handles empty batch', async () => {
    const result = await repo.insert([]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(0);
  });
});
