import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { searchIndexes } from '../schema/search-indexes.ts';
import { generateId, now } from '../utils.ts';
import type { NewSearchIndexRow, SearchIndexRow } from '../schema/search-indexes.ts';
import type { Result } from '@prodmind/contracts';

export class SearchIndexRepository {
  constructor(private db: Database) {}

  async insert(input: Omit<NewSearchIndexRow, 'id' | 'createdAt'>): Promise<Result<SearchIndexRow, string>> {
    try {
      const value: NewSearchIndexRow = { id: generateId(), snapshotId: input.snapshotId, indexType: input.indexType, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now() };
      const [result] = await this.db.insert(searchIndexes).values(value).returning();
      return { success: true, data: result! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert search index failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<SearchIndexRow[]> {
    return this.db.select().from(searchIndexes).where(eq(searchIndexes.snapshotId, snapshotId)).orderBy(searchIndexes.createdAt);
  }

  async queryByType(indexType: string): Promise<SearchIndexRow[]> {
    return this.db.select().from(searchIndexes).where(eq(searchIndexes.indexType, indexType)).orderBy(searchIndexes.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<SearchIndexRow | undefined> {
    const [result] = await this.db.select().from(searchIndexes).where(eq(searchIndexes.fingerprint, fingerprint)).limit(1);
    return result;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(searchIndexes).where(eq(searchIndexes.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete search index failed' };
    }
  }
}
