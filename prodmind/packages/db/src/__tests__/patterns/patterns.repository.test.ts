import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { PatternsRepository } from '../../repositories/patterns.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS architecture_patterns (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), pattern_type TEXT NOT NULL, is_anti_pattern INTEGER NOT NULL DEFAULT 0, severity TEXT NOT NULL, confidence REAL NOT NULL, fingerprint TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, impacted_nodes_json TEXT, metric_evidence_json TEXT, metadata_json TEXT, created_at TEXT NOT NULL)`,
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

describe('PatternsRepository', () => {
  let client: Client; let db: Database; let repo: PatternsRepository; let snapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-pat-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedProjectSnapshot(client);
    snapshotId = seed.snapshotId;
    repo = new PatternsRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries patterns by snapshot', async () => {
    const result = await repo.insert([{ snapshotId, patternType: 'GOD_MODULE', isAntiPattern: true, severity: 'HIGH', confidence: 0.85, fingerprint: 'fp-pat-1', title: 'God module', summary: 'Test', impactedNodesJson: null, metricEvidenceJson: null, metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    const pats = await repo.queryBySnapshot(snapshotId);
    expect(pats.length).toBeGreaterThan(0);
  });

  it('queries by severity', async () => {
    const pats = await repo.queryBySeverity('HIGH');
    expect(pats.length).toBeGreaterThan(0);
  });

  it('queries by pattern type', async () => {
    const pats = await repo.queryByPatternType('GOD_MODULE');
    expect(pats.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const pat = await repo.queryByFingerprint('fp-pat-1');
    expect(pat).toBeDefined();
  });

  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    const pats = await repo.queryBySnapshot(snapshotId);
    expect(pats).toHaveLength(0);
  });
});
