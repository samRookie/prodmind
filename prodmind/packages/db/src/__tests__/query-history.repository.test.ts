import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema/index.ts';
import type { Database } from '../client.ts';
import { QueryHistoryRepository } from '../repositories/query-history.repository.ts';
import { generateId, now } from '../utils.ts';

describe('QueryHistoryRepository', () => {
  let client: Client;
  let db: Database;
  let repo: QueryHistoryRepository;
  let snapshotId: string;
  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-qh-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await client.execute('CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, name TEXT, created_at TEXT)');
    snapshotId = generateId();
    await client.execute({ sql: 'INSERT INTO snapshots (id, name, created_at) VALUES (?, ?, ?)', args: [snapshotId, 'test', now()] });
    await client.execute('CREATE TABLE IF NOT EXISTS query_history (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), query_type TEXT NOT NULL, fingerprint TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL)');
    repo = new QueryHistoryRepository(db);
  });
  afterAll(() => { client.close(); });
  it('inserts and queries by snapshot', async () => {
    const result = await repo.insert({ snapshotId, queryType: 'NODE_QUERY', fingerprint: 'fp1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.queryType).toBe('NODE_QUERY');
    const rows = await repo.queryBySnapshot(snapshotId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.queryType).toBe('NODE_QUERY');
  });
  it('queries by fingerprint', async () => {
    const row = await repo.queryByFingerprint('fp1');
    expect(row).toBeDefined();
  });
  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    expect(await repo.queryBySnapshot(snapshotId)).toHaveLength(0);
  });
});
