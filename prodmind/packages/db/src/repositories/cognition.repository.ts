import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { cognitionSnapshots } from '../schema/cognition-snapshots.ts';
import { generateId, now } from '../utils.ts';
import type { NewCognitionSnapshot, CognitionSnapshot } from '../schema/cognition-snapshots.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class CognitionRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewCognitionSnapshot, 'id' | 'createdAt'>[]): Promise<Result<CognitionSnapshot[], string>> {
    try {
      const values: NewCognitionSnapshot[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, cognitionType: input.cognitionType,
        healthScore: input.healthScore, healthLabel: input.healthLabel, fingerprint: input.fingerprint,
        architectureSummary: input.architectureSummary ?? null, dominantRisksJson: input.dominantRisksJson ?? null,
        dominantPatternsJson: input.dominantPatternsJson ?? null, severityDistributionJson: input.severityDistributionJson ?? null,
        summaryJson: input.summaryJson ?? null, metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: CognitionSnapshot[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(cognitionSnapshots).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert cognition snapshots failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<CognitionSnapshot[]> {
    return this.db.select().from(cognitionSnapshots).where(eq(cognitionSnapshots.snapshotId, snapshotId)).orderBy(cognitionSnapshots.createdAt);
  }

  async queryByCognitionType(cognitionType: string): Promise<CognitionSnapshot[]> {
    return this.db.select().from(cognitionSnapshots).where(eq(cognitionSnapshots.cognitionType, cognitionType)).orderBy(cognitionSnapshots.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<CognitionSnapshot | undefined> {
    const result = await this.db.select().from(cognitionSnapshots).where(eq(cognitionSnapshots.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(cognitionSnapshots).where(eq(cognitionSnapshots.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete cognition snapshots failed' };
    }
  }
}
