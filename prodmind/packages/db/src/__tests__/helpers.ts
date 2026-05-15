import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema/index.ts';
import type { Database } from '../client.ts';
import { generateId, now } from '../utils.ts';

export async function createTestDb(): Promise<{ client: Client; db: Database; dbPath: string }> {
  const dbPath = path.join(os.tmpdir(), `prodmind-${randomUUID()}.db`);
  const client = createClient({ url: `file:${dbPath}` });
  await client.execute('PRAGMA foreign_keys=ON');
  const db = drizzle(client, { schema }) as Database;
  return { client, db, dbPath };
}

export async function createTables(client: Client): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      active_snapshot_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      upload_filename TEXT,
      upload_hash TEXT,
      extraction_path TEXT,
      created_at TEXT NOT NULL,
      activated_at TEXT,
      metadata_json TEXT,
      compression_ratio REAL,
      confidence_score REAL,
      is_degraded INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      file_path TEXT NOT NULL,
      file_hash TEXT,
      node_type TEXT NOT NULL,
      symbol_name TEXT,
      language TEXT,
      metadata_json TEXT,
      summary_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      source_node_id TEXT NOT NULL REFERENCES nodes(id),
      target_node_id TEXT NOT NULL REFERENCES nodes(id),
      edge_type TEXT NOT NULL,
      weight REAL DEFAULT 1.0,
      metadata_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      node_id TEXT NOT NULL REFERENCES nodes(id),
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      fingerprint TEXT,
      created_at TEXT NOT NULL,
      last_seen_snapshot_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES snapshots(id),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      reproducibility_fingerprint_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS event_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS job_queue (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      payload_json TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ];
  for (const sql of stmts) {
    await client.execute(sql);
  }
}

export async function createFullTestDb(): Promise<{ client: Client; db: Database; dbPath: string }> {
  const env = await createTestDb();
  await createTables(env.client);
  return env;
}

export async function seedProject(
  client: Client,
  overrides?: { id?: string; name?: string; status?: string; createdAt?: string; updatedAt?: string; activeSnapshotId?: string | null; description?: string | null },
): Promise<{ id: string }> {
  const id = overrides?.id ?? generateId();
  const nowStr = now();
  await client.execute({
    sql: `INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, overrides?.name ?? 'Test Project', overrides?.description ?? null, overrides?.status ?? 'PENDING', overrides?.createdAt ?? nowStr, overrides?.updatedAt ?? nowStr],
  });
  return { id };
}

export async function seedSnapshot(
  client: Client,
  projectId: string,
  overrides?: { id?: string; status?: string; version?: number },
): Promise<{ id: string }> {
  const id = overrides?.id ?? generateId();
  await client.execute({
    sql: `INSERT INTO snapshots (id, project_id, version, status, created_at) VALUES (?, ?, ?, ?, ?)`,
    args: [id, projectId, overrides?.version ?? 1, overrides?.status ?? 'PENDING', now()],
  });
  return { id };
}

export async function seedNodes(
  client: Client,
  snapshotId: string,
  count = 3,
): Promise<{ id: string }[]> {
  const result: { id: string }[] = [];
  for (let i = 0; i < count; i++) {
    const id = `node-${i}-${snapshotId}`;
    await client.execute({
      sql: `INSERT INTO nodes (id, snapshot_id, file_path, node_type, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [id, snapshotId, `/path/to/file-${i}.ts`, 'FILE', now()],
    });
    result.push({ id });
  }
  return result;
}
