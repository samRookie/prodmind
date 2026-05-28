import { eq, and, gte, lte } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { architectureDiffs } from '../schema/architecture-diffs.ts';
import { generateId, now } from '../utils.ts';
import type { NewArchitectureDiff, ArchitectureDiff } from '../schema/architecture-diffs.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class ArchitectureDiffRepository {
  constructor(private db: Database) {}

  async insert(inputs: Omit<NewArchitectureDiff, 'id' | 'createdAt'>[]): Promise<Result<ArchitectureDiff[], string>> {
    try {
      const values: NewArchitectureDiff[] = inputs.map((input) => ({
        id: generateId(), previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        diffType: input.diffType, severity: input.severity, fingerprint: input.fingerprint,
        metadataJson: input.metadataJson ?? null, createdAt: now(),
      }));
      const inserted: ArchitectureDiff[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(architectureDiffs).values(batch).returning();
        inserted.push(...result);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert architecture diffs failed' };
    }
  }

  async queryByCurrentSnapshot(snapshotId: string): Promise<ArchitectureDiff[]> {
    return this.db.select().from(architectureDiffs).where(eq(architectureDiffs.currentSnapshotId, snapshotId)).orderBy(architectureDiffs.createdAt);
  }

  async queryByPreviousSnapshot(snapshotId: string): Promise<ArchitectureDiff[]> {
    return this.db.select().from(architectureDiffs).where(eq(architectureDiffs.previousSnapshotId, snapshotId)).orderBy(architectureDiffs.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<ArchitectureDiff | undefined> {
    const result = await this.db.select().from(architectureDiffs).where(eq(architectureDiffs.fingerprint, fingerprint)).limit(1);
    return result[0];
  }

  async queryBySeverity(severity: string): Promise<ArchitectureDiff[]> {
    return this.db.select().from(architectureDiffs).where(eq(architectureDiffs.severity, severity)).orderBy(architectureDiffs.createdAt);
  }

  async queryBySnapshotPair(previousSnapshotId: string, currentSnapshotId: string): Promise<ArchitectureDiff[]> {
    return this.db.select().from(architectureDiffs).where(and(eq(architectureDiffs.previousSnapshotId, previousSnapshotId), eq(architectureDiffs.currentSnapshotId, currentSnapshotId))).orderBy(architectureDiffs.createdAt);
  }

  async queryHistoricalRange(snapshotIdStart: string, snapshotIdEnd: string): Promise<ArchitectureDiff[]> {
    return this.db.select().from(architectureDiffs).where(and(gte(architectureDiffs.currentSnapshotId, snapshotIdStart), lte(architectureDiffs.currentSnapshotId, snapshotIdEnd))).orderBy(architectureDiffs.createdAt);
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(architectureDiffs).where(eq(architectureDiffs.currentSnapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete architecture diffs failed' };
    }
  }
}
