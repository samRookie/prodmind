import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../schema/index.ts';
import type { Database } from '../../client.ts';
import { CognitionRepository } from '../../repositories/cognition.repository.ts';
import { generateId, now } from '../../utils.ts';

async function createNewTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'PENDING', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, active_snapshot_id TEXT)`,
    `CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', upload_filename TEXT, upload_hash TEXT, extraction_path TEXT, created_at TEXT NOT NULL, activated_at TEXT, metadata_json TEXT, compression_ratio REAL, confidence_score REAL, is_degraded INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS cognition_snapshots (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), cognition_type TEXT NOT NULL, health_score REAL NOT NULL, health_label TEXT NOT NULL, fingerprint TEXT NOT NULL, architecture_summary TEXT, dominant_risks_json TEXT, dominant_patterns_json TEXT, severity_distribution_json TEXT, summary_json TEXT, metadata_json TEXT, created_at TEXT NOT NULL)`,
  ];
  for (const sql of stmts) { await client.execute(sql); }
}

async function seedProjectSnapshot(client: Client): Promise<{ projectId: string; snapshotId: string }> {
  const projectId = generateId(); const snapshotId = generateId(); const nowStr = now();
  await client.execute({ sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [projectId, 'Test', null, 'ACTIVE', nowStr, nowStr] });
  await client.execute({ sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`, args: [snapshotId, projectId, 1, 'ACTIVE', nowStr] });
  return { projectId, snapshotId };
}

describe('CognitionRepository', () => {
  let client: Client; let db: Database; let repo: CognitionRepository; let snapshotId: string;

  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-cog-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL'); await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await createNewTables(client);
    const seed = await seedProjectSnapshot(client);
    snapshotId = seed.snapshotId;
    repo = new CognitionRepository(db);
  });

  afterAll(() => { client.close(); });

  it('inserts and queries cognition snapshots by snapshot', async () => {
    const result = await repo.insert([{ snapshotId, cognitionType: 'GLOBAL', healthScore: 0.75, healthLabel: 'MODERATE', fingerprint: 'fp-cog-1', architectureSummary: 'Summary', dominantRisksJson: null, dominantPatternsJson: null, severityDistributionJson: null, summaryJson: null, metadataJson: null }]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    const cogs = await repo.queryBySnapshot(snapshotId);
    expect(cogs.length).toBeGreaterThan(0);
  });

  it('queries by cognition type', async () => {
    const cogs = await repo.queryByCognitionType('GLOBAL');
    expect(cogs.length).toBeGreaterThan(0);
  });

  it('queries by fingerprint', async () => {
    const cog = await repo.queryByFingerprint('fp-cog-1');
    expect(cog).toBeDefined();
  });

  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    const cogs = await repo.queryBySnapshot(snapshotId);
    expect(cogs).toHaveLength(0);
  });
});
