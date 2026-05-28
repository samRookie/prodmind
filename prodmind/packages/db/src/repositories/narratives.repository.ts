import { eq, and, gte, lte } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { narratives } from '../schema/narratives.ts';
import { generateId, now } from '../utils.ts';
import type { NewNarrative, Narrative } from '../schema/narratives.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class NarrativesRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewNarrative, 'id' | 'createdAt'>[]): Promise<Result<Narrative[], string>> {
    try {
      const values: NewNarrative[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, narrativeType: input.narrativeType,
        severity: input.severity, fingerprint: input.fingerprint, summary: input.summary,
        metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: Narrative[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(narratives).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert narratives failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<Narrative[]> {
    return this.db.select().from(narratives).where(eq(narratives.snapshotId, snapshotId)).orderBy(narratives.createdAt);
  }

  async queryBySeverity(severity: string): Promise<Narrative[]> {
    return this.db.select().from(narratives).where(eq(narratives.severity, severity)).orderBy(narratives.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<Narrative | undefined> {
    const result = await this.db.select().from(narratives).where(eq(narratives.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async queryByType(narrativeType: string): Promise<Narrative[]> {
    return this.db.select().from(narratives).where(eq(narratives.narrativeType, narrativeType)).orderBy(narratives.createdAt);
  }

  async queryHistoricalRange(snapshotIdStart: string, snapshotIdEnd: string): Promise<Narrative[]> {
    return this.db.select().from(narratives).where(and(gte(narratives.snapshotId, snapshotIdStart), lte(narratives.snapshotId, snapshotIdEnd))).orderBy(narratives.createdAt);
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(narratives).where(eq(narratives.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete narratives failed' };
    }
  }
}
