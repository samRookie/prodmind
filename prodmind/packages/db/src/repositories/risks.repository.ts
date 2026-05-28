import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { riskCorrelations } from '../schema/risk-correlations.ts';
import { generateId, now } from '../utils.ts';
import type { NewRiskCorrelation, RiskCorrelation } from '../schema/risk-correlations.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class RisksRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewRiskCorrelation, 'id' | 'createdAt'>[]): Promise<Result<RiskCorrelation[], string>> {
    try {
      const values: NewRiskCorrelation[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, riskType: input.riskType,
        severity: input.severity, normalizedScore: input.normalizedScore, fingerprint: input.fingerprint,
        title: input.title, summary: input.summary, impactedNodesJson: input.impactedNodesJson ?? null,
        metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: RiskCorrelation[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(riskCorrelations).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert risks failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<RiskCorrelation[]> {
    return this.db.select().from(riskCorrelations).where(eq(riskCorrelations.snapshotId, snapshotId)).orderBy(riskCorrelations.createdAt);
  }

  async queryBySeverity(severity: string): Promise<RiskCorrelation[]> {
    return this.db.select().from(riskCorrelations).where(eq(riskCorrelations.severity, severity)).orderBy(riskCorrelations.createdAt);
  }

  async queryByRiskType(riskType: string): Promise<RiskCorrelation[]> {
    return this.db.select().from(riskCorrelations).where(eq(riskCorrelations.riskType, riskType)).orderBy(riskCorrelations.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<RiskCorrelation | undefined> {
    const result = await this.db.select().from(riskCorrelations).where(eq(riskCorrelations.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(riskCorrelations).where(eq(riskCorrelations.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete risks failed' };
    }
  }
}
