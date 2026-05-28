import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { architectureTrends } from '../schema/architecture-trends.ts';
import { generateId, now } from '../utils.ts';
import type { NewArchitectureTrend, ArchitectureTrend } from '../schema/architecture-trends.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class TrendsRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewArchitectureTrend, 'id' | 'createdAt'>[]): Promise<Result<ArchitectureTrend[], string>> {
    try {
      const values: NewArchitectureTrend[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, trendType: input.trendType,
        direction: input.direction, severity: input.severity, normalizedSeverity: input.normalizedSeverity,
        growthRate: input.growthRate, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: ArchitectureTrend[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(architectureTrends).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert trends failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<ArchitectureTrend[]> {
    return this.db.select().from(architectureTrends).where(eq(architectureTrends.snapshotId, snapshotId)).orderBy(architectureTrends.createdAt);
  }

  async queryByTrendType(trendType: string): Promise<ArchitectureTrend[]> {
    return this.db.select().from(architectureTrends).where(eq(architectureTrends.trendType, trendType)).orderBy(architectureTrends.createdAt);
  }

  async queryBySeverity(severity: string): Promise<ArchitectureTrend[]> {
    return this.db.select().from(architectureTrends).where(eq(architectureTrends.severity, severity)).orderBy(architectureTrends.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<ArchitectureTrend | undefined> {
    const result = await this.db.select().from(architectureTrends).where(eq(architectureTrends.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(architectureTrends).where(eq(architectureTrends.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete trends failed' };
    }
  }
}
