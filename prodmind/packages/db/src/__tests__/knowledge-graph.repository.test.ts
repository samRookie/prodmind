import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema/index.ts';
import type { Database } from '../client.ts';
import { KnowledgeGraphRepository } from '../repositories/knowledge-graph.repository.ts';
import { generateId, now } from '../utils.ts';

describe('KnowledgeGraphRepository', () => {
  let client: Client;
  let db: Database;
  let repo: KnowledgeGraphRepository;
  let snapshotId: string;
  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-kg-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await client.execute('CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, name TEXT, created_at TEXT)');
    snapshotId = generateId();
    await client.execute({ sql: 'INSERT INTO snapshots (id, name, created_at) VALUES (?, ?, ?)', args: [snapshotId, 'test', now()] });
    await client.execute('CREATE TABLE IF NOT EXISTS knowledge_graph (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), node_type TEXT NOT NULL, fingerprint TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL)');
    repo = new KnowledgeGraphRepository(db);
  });
  afterAll(() => { client.close(); });
  it('inserts and queries by snapshot', async () => {
    const result = await repo.insert({ snapshotId, nodeType: 'NODE', fingerprint: 'fp1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nodeType).toBe('NODE');
    const rows = await repo.queryBySnapshot(snapshotId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.nodeType).toBe('NODE');
  });
  it('queries by type', async () => {
    const rows = await repo.queryByType('NODE');
    expect(rows).toHaveLength(1);
  });
  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    expect(await repo.queryBySnapshot(snapshotId)).toHaveLength(0);
  });
});
