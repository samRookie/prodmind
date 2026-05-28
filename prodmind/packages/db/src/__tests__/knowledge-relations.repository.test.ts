import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import * as os from 'node:os';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../schema/index.ts';
import type { Database } from '../client.ts';
import { KnowledgeRelationsRepository } from '../repositories/knowledge-relations.repository.ts';
import { generateId, now } from '../utils.ts';

describe('KnowledgeRelationsRepository', () => {
  let client: Client;
  let db: Database;
  let repo: KnowledgeRelationsRepository;
  let snapshotId: string;
  beforeAll(async () => {
    const dbPath = path.join(os.tmpdir(), `prodmind-test-kr-${randomUUID()}.db`);
    client = createClient({ url: `file:${dbPath}` });
    await client.execute('PRAGMA journal_mode=WAL');
    await client.execute('PRAGMA foreign_keys=ON');
    db = drizzle(client, { schema }) as Database;
    await client.execute('CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, name TEXT, created_at TEXT)');
    snapshotId = generateId();
    await client.execute({ sql: 'INSERT INTO snapshots (id, name, created_at) VALUES (?, ?, ?)', args: [snapshotId, 'test', now()] });
    await client.execute('CREATE TABLE IF NOT EXISTS knowledge_relations (id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL REFERENCES snapshots(id), relation_type TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL, fingerprint TEXT NOT NULL, metadata_json TEXT, created_at TEXT NOT NULL)');
    repo = new KnowledgeRelationsRepository(db);
  });
  afterAll(() => { client.close(); });
  it('inserts and queries by snapshot', async () => {
    const result = await repo.insert({ snapshotId, relationType: 'DEPENDS_ON', sourceId: 'n1', targetId: 'n2', fingerprint: 'fp1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.relationType).toBe('DEPENDS_ON');
    const rows = await repo.queryBySnapshot(snapshotId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.relationType).toBe('DEPENDS_ON');
  });
  it('queries by source', async () => {
    const rows = await repo.queryBySource('n1');
    expect(rows).toHaveLength(1);
  });
  it('queries by target', async () => {
    const rows = await repo.queryByTarget('n2');
    expect(rows).toHaveLength(1);
  });
  it('deletes by snapshot', async () => {
    await repo.deleteBySnapshot(snapshotId);
    expect(await repo.queryBySnapshot(snapshotId)).toHaveLength(0);
  });
});
