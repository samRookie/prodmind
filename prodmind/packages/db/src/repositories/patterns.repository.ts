import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { architecturePatterns } from '../schema/architecture-patterns.ts';
import { generateId, now } from '../utils.ts';
import type { NewArchitecturePattern, ArchitecturePattern } from '../schema/architecture-patterns.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class PatternsRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewArchitecturePattern, 'id' | 'createdAt'>[]): Promise<Result<ArchitecturePattern[], string>> {
    try {
      const values: NewArchitecturePattern[] = inputs.map((input) => ({
        id: generateId(), snapshotId: input.snapshotId, patternType: input.patternType,
        isAntiPattern: input.isAntiPattern, severity: input.severity, confidence: input.confidence,
        fingerprint: input.fingerprint, title: input.title, summary: input.summary,
        impactedNodesJson: input.impactedNodesJson ?? null, metricEvidenceJson: input.metricEvidenceJson ?? null,
        metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: ArchitecturePattern[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(architecturePatterns).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert patterns failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<ArchitecturePattern[]> {
    return this.db.select().from(architecturePatterns).where(eq(architecturePatterns.snapshotId, snapshotId)).orderBy(architecturePatterns.createdAt);
  }

  async queryBySeverity(severity: string): Promise<ArchitecturePattern[]> {
    return this.db.select().from(architecturePatterns).where(eq(architecturePatterns.severity, severity)).orderBy(architecturePatterns.createdAt);
  }

  async queryByPatternType(patternType: string): Promise<ArchitecturePattern[]> {
    return this.db.select().from(architecturePatterns).where(eq(architecturePatterns.patternType, patternType)).orderBy(architecturePatterns.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<ArchitecturePattern | undefined> {
    const result = await this.db.select().from(architecturePatterns).where(eq(architecturePatterns.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(architecturePatterns).where(eq(architecturePatterns.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete patterns failed' };
    }
  }
}
