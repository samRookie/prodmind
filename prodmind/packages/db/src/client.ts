import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getEnv } from '@prodmind/core';
import * as schema from './schema/index.ts';

export type Database = LibSQLDatabase<typeof schema> & { $client: Client };

export interface DrizzleClientOptions {
  url?: string;
  authToken?: string;
}

let _db: Database | null = null;

function applyPragmas(client: Client): void {
  client.execute('PRAGMA journal_mode=WAL');
  client.execute('PRAGMA foreign_keys=ON');
}

export function createDrizzleClient(options?: DrizzleClientOptions): Database {
  const url = options?.url ?? getEnv().DATABASE_URL;

  const client = createClient({
    url,
    authToken: options?.authToken,
  });

  applyPragmas(client);

  const db = drizzle(client, { schema }) as Database;
  _db = db;
  return db;
}

export function createTestClient(): { client: Client; db: Database } {
  const client = createClient({ url: 'file::memory:' });
  client.execute('PRAGMA journal_mode=WAL');
  client.execute('PRAGMA foreign_keys=ON');
  const db = drizzle(client, { schema }) as Database;
  return { client, db };
}

export function getDb(): Database {
  if (!_db) {
    throw new Error('Database not initialized. Call createDrizzleClient() first.');
  }
  return _db;
}

export function closeDb(): void {
  _db = null;
}
