import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { reports } from '../schema/reports.ts';
import { generateId, now } from '../utils.ts';
import type { NewReport, Report } from '../schema/reports.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class ReportsRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewReport, 'id' | 'createdAt'>[]): Promise<Result<Report[], string>> {
    try {
      const values: NewReport[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, reportType: input.reportType,
        fingerprint: input.fingerprint, markdownContent: input.markdownContent ?? null,
        jsonContent: input.jsonContent ?? null, metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: Report[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(reports).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert reports failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<Report[]> {
    return this.db.select().from(reports).where(eq(reports.snapshotId, snapshotId)).orderBy(reports.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<Report | undefined> {
    const result = await this.db.select().from(reports).where(eq(reports.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async queryByType(reportType: string): Promise<Report[]> {
    return this.db.select().from(reports).where(eq(reports.reportType, reportType)).orderBy(reports.createdAt);
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(reports).where(eq(reports.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete reports failed' };
    }
  }
}
