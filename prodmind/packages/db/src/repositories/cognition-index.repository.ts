import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { cognitionIndexes } from '../schema/cognition-indexes.ts';
import { generateId, now } from '../utils.ts';
import type { NewCognitionIndexRow, CognitionIndexRow } from '../schema/cognition-indexes.ts';
import type { Result } from '@prodmind/contracts';

export class CognitionIndexRepository {
  constructor(private db: Database) {}

  async insert(input: Omit<NewCognitionIndexRow, 'id' | 'createdAt'>): Promise<Result<CognitionIndexRow, string>> {
    try {
      const value: NewCognitionIndexRow = { id: generateId(), snapshotId: input.snapshotId, indexType: input.indexType, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now() };
      const [result] = await this.db.insert(cognitionIndexes).values(value).returning();
      return { success: true, data: result! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert cognition index failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<CognitionIndexRow[]> {
    return this.db.select().from(cognitionIndexes).where(eq(cognitionIndexes.snapshotId, snapshotId)).orderBy(cognitionIndexes.createdAt);
  }

  async queryByType(indexType: string): Promise<CognitionIndexRow[]> {
    return this.db.select().from(cognitionIndexes).where(eq(cognitionIndexes.indexType, indexType)).orderBy(cognitionIndexes.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<CognitionIndexRow | undefined> {
    const [result] = await this.db.select().from(cognitionIndexes).where(eq(cognitionIndexes.fingerprint, fingerprint)).limit(1);
    return result;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(cognitionIndexes).where(eq(cognitionIndexes.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete cognition index failed' };
    }
  }
}
