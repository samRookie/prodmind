import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { cognitionTimeseries } from '../schema/cognition-timeseries.ts';
import { generateId, now } from '../utils.ts';
import type { NewCognitionTimeseries, CognitionTimeseries } from '../schema/cognition-timeseries.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class TimeseriesRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewCognitionTimeseries, 'id' | 'createdAt'>[]): Promise<Result<CognitionTimeseries[], string>> {
    try {
      const values: NewCognitionTimeseries[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, cognitionType: input.cognitionType,
        timeseriesFingerprint: input.timeseriesFingerprint, metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: CognitionTimeseries[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(cognitionTimeseries).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert timeseries failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<CognitionTimeseries[]> {
    return this.db.select().from(cognitionTimeseries).where(eq(cognitionTimeseries.snapshotId, snapshotId)).orderBy(cognitionTimeseries.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<CognitionTimeseries | undefined> {
    const result = await this.db.select().from(cognitionTimeseries).where(eq(cognitionTimeseries.timeseriesFingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async queryByType(cognitionType: string): Promise<CognitionTimeseries[]> {
    return this.db.select().from(cognitionTimeseries).where(eq(cognitionTimeseries.cognitionType, cognitionType)).orderBy(cognitionTimeseries.createdAt);
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(cognitionTimeseries).where(eq(cognitionTimeseries.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete timeseries failed' };
    }
  }
}
