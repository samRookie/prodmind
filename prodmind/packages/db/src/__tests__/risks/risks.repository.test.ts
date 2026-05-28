import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { RisksRepository } from '../../repositories/risks.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS risk_correlations (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), risk_type TEXT NOT NULL, severity TEXT NOT NULL, normalized_score REAL NOT NULL, fingerprint TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, impacted_nodes_json TEXT, metadata_json TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const sql of stmts) { await client.execute(sql); }
}

async function seedProjectSnapshot(client: Client): Promise<{ projectId: string; snapshotId: string }> {
  const projectId = generateId(); const snapshotId = generateId(); const nowStr = now();
  await client.execute({ sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [projectId, 'Test', null, 'ACTIVE', nowStr, nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [snapshotId, projectId, 1, 'ACTIVE', nowStr] });
  return { projectId, snapshotId };
}

describe('RisksRepository', () => {
  let client: Client; let db: Database; let repo: RisksRepository; let snapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-risk-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL'); await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedProjectSnapshot(client);
    snapshotId = seed.snapshotId;
    repo = new RisksRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries risk correlations by snapshot', async () => {
    const result = await repo.insert([{ snapshotId, riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, fingerprint: 'fp-risk-1', title: 'Stability risk', summary: 'Test', impactedNodesJson: null, metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    const risks = await repo.queryBySnapshot(snapshotId);
    expect(risks.length).toBeGreaterThan(0);
  });

  it('queries by severity', async () => {
    const risks = await repo.queryBySeverity('CRITICAL');
    expect(risks.length).toBeGreaterThan(0);
  });

  it('queries by risk type', async () => {
    const risks = await repo.queryByRiskType('STABILITY_RISK');
    expect(risks.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const risk = await repo.queryByFingerprint('fp-risk-1');
    expect(risk).toBeDefined();
  });

  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    const risks = await repo.queryBySnapshot(snapshotId);
    expect(risks).toHaveLength(0);
  });
});
