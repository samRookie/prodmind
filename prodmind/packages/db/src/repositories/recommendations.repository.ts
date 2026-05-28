import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { recommendations } from '../schema/recommendations.ts';
import { generateId, now } from '../utils.ts';
import type { NewRecommendation, Recommendation } from '../schema/recommendations.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class RecommendationsRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewRecommendation, 'id' | 'createdAt'>[]): Promise<Result<Recommendation[], string>> {
    try {
      const values: NewRecommendation[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, category: input.category, severity: input.severity,
        priority: input.priority, priorityScore: input.priorityScore, fingerprint: input.fingerprint,
        title: input.title, summary: input.summary, rationale: input.rationale ?? null,
        impactedNodesJson: input.impactedNodesJson ?? null, remediationJson: input.remediationJson ?? null,
        metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: Recommendation[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(recommendations).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert recommendations failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<Recommendation[]> {
    return this.db.select().from(recommendations).where(eq(recommendations.snapshotId, snapshotId)).orderBy(recommendations.createdAt);
  }

  async queryBySeverity(severity: string): Promise<Recommendation[]> {
    return this.db.select().from(recommendations).where(eq(recommendations.severity, severity)).orderBy(recommendations.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<Recommendation | undefined> {
    const result = await this.db.select().from(recommendations).where(eq(recommendations.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(recommendations).where(eq(recommendations.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete recommendations failed' };
    }
  }
}
