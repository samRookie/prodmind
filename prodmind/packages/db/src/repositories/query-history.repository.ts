import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { queryHistory } from '../schema/query-history.ts';
import { generateId, now } from '../utils.ts';
import type { NewQueryHistory, QueryHistory } from '../schema/query-history.ts';
import type { Result } from '@prodmind/contracts';

export class QueryHistoryRepository {
  constructor(private db: Database) {}

  async insert(input: Omit<NewQueryHistory, 'id' | 'createdAt'>): Promise<Result<QueryHistory, string>> {
    try {
      const value: NewQueryHistory = { id: generateId(), snapshotId: input.snapshotId, queryType: input.queryType, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now() };
      const [result] = await this.db.insert(queryHistory).values(value).returning();
      return { success: true, data: result! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert query history failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<QueryHistory[]> {
    return this.db.select().from(queryHistory).where(eq(queryHistory.snapshotId, snapshotId)).orderBy(queryHistory.createdAt);
  }

  async queryByType(queryType: string): Promise<QueryHistory[]> {
    return this.db.select().from(queryHistory).where(eq(queryHistory.queryType, queryType)).orderBy(queryHistory.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<QueryHistory | undefined> {
    const [result] = await this.db.select().from(queryHistory).where(eq(queryHistory.fingerprint, fingerprint)).limit(1);
    return result;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(queryHistory).where(eq(queryHistory.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete query history failed' };
    }
  }
}
