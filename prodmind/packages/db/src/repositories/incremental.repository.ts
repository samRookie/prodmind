import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { snapshotLineage } from '../schema/snapshot-lineage.ts';
import { snapshotDiffs } from '../schema/snapshot-diffs.ts';
import { reuseArtifacts } from '../schema/reuse-artifacts.ts';
import { invalidationRegions } from '../schema/invalidation-regions.ts';
import { incrementalMetrics } from '../schema/incremental-metrics.ts';
import type { NewSnapshotLineage, SnapshotLineage } from '../schema/snapshot-lineage.ts';
import type { NewSnapshotDiffRow, SnapshotDiffRow } from '../schema/snapshot-diffs.ts';
import type { NewReuseArtifact, ReuseArtifact } from '../schema/reuse-artifacts.ts';
import type { NewInvalidationRegion, InvalidationRegion } from '../schema/invalidation-regions.ts';
import type { NewIncrementalMetricsRow, IncrementalMetricsRow } from '../schema/incremental-metrics.ts';
import { generateId, now } from '../utils.ts';
import type { Result } from '@prodmind/contracts';
import { snapshots } from '../schema/snapshots.ts';
import { SnapshotStatus } from '@prodmind/contracts';

export class IncrementalRepository {
  constructor(private db: Database) {}

  async insertLineage(input: Omit<NewSnapshotLineage, 'id' | 'createdAt'>): Promise<Result<SnapshotLineage, string>> {
    try {
      const [record] = await this.db
        .insert(snapshotLineage)
        .values({ id: generateId(), createdAt: now(), ...input })
        .returning();
      return { success: true, data: record! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Lineage insert failed' };
    }
  }

  async insertDiff(input: Omit<NewSnapshotDiffRow, 'id' | 'createdAt'>): Promise<Result<SnapshotDiffRow, string>> {
    try {
      const [record] = await this.db
        .insert(snapshotDiffs)
        .values({ id: generateId(), createdAt: now(), ...input })
        .returning();
      return { success: true, data: record! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Diff insert failed' };
    }
  }

  async insertReuseArtifacts(inputs: Omit<NewReuseArtifact, 'id' | 'createdAt'>[]): Promise<Result<ReuseArtifact[], string>> {
    try {
      const result: ReuseArtifact[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({ id: generateId(), createdAt: now(), ...input }));
        const rows = await this.db.insert(reuseArtifacts).values(values).returning();
        result.push(...rows);
      }
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Reuse insert failed' };
    }
  }

  async insertInvalidations(inputs: Omit<NewInvalidationRegion, 'id' | 'createdAt'>[]): Promise<Result<InvalidationRegion[], string>> {
    try {
      const result: InvalidationRegion[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({ id: generateId(), createdAt: now(), ...input }));
        const rows = await this.db.insert(invalidationRegions).values(values).returning();
        result.push(...rows);
      }
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Invalidation insert failed' };
    }
  }

  async insertMetrics(input: Omit<NewIncrementalMetricsRow, 'id' | 'createdAt'>): Promise<Result<IncrementalMetricsRow, string>> {
    try {
      const [record] = await this.db
        .insert(incrementalMetrics)
        .values({ id: generateId(), createdAt: now(), ...input })
        .returning();
      return { success: true, data: record! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Incremental metrics insert failed' };
    }
  }

  async getPreviousActiveSnapshot(projectId: string, excludeSnapshotId?: string): Promise<{ id: string; metadataJson: string | null } | null> {
    const condition = excludeSnapshotId
      ? and(eq(snapshots.projectId, projectId), eq(snapshots.status, SnapshotStatus.ACTIVE), eq(snapshots.id, excludeSnapshotId))
      : and(eq(snapshots.projectId, projectId), eq(snapshots.status, SnapshotStatus.ACTIVE));

    const result = await this.db
      .select({ id: snapshots.id, metadataJson: snapshots.metadataJson })
      .from(snapshots)
      .where(condition)
      .orderBy(snapshots.version)
      .limit(1);

    return result[0] ?? null;
  }

  async getLineageBySnapshot(snapshotId: string): Promise<SnapshotLineage | null> {
    const [result] = await this.db
      .select()
      .from(snapshotLineage)
      .where(eq(snapshotLineage.childSnapshotId, snapshotId))
      .limit(1);
    return result ?? null;
  }

  async getDiffsBySnapshot(snapshotId: string): Promise<SnapshotDiffRow[]> {
    return this.db
      .select()
      .from(snapshotDiffs)
      .where(eq(snapshotDiffs.snapshotId, snapshotId))
      .orderBy(snapshotDiffs.diffType);
  }

  async getReuseBySnapshot(snapshotId: string): Promise<ReuseArtifact[]> {
    return this.db
      .select()
      .from(reuseArtifacts)
      .where(eq(reuseArtifacts.snapshotId, snapshotId))
      .orderBy(reuseArtifacts.artifactType);
  }

  async getInvalidationBySnapshot(snapshotId: string): Promise<InvalidationRegion[]> {
    return this.db
      .select()
      .from(invalidationRegions)
      .where(eq(invalidationRegions.snapshotId, snapshotId))
      .orderBy(invalidationRegions.regionType);
  }

  async getMetricsBySnapshot(snapshotId: string): Promise<IncrementalMetricsRow | null> {
    const [result] = await this.db
      .select()
      .from(incrementalMetrics)
      .where(eq(incrementalMetrics.snapshotId, snapshotId))
      .limit(1);
    return result ?? null;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(incrementalMetrics).where(eq(incrementalMetrics.snapshotId, snapshotId));
        await tx.delete(snapshotDiffs).where(eq(snapshotDiffs.snapshotId, snapshotId));
        await tx.delete(reuseArtifacts).where(eq(reuseArtifacts.snapshotId, snapshotId));
        await tx.delete(invalidationRegions).where(eq(invalidationRegions.snapshotId, snapshotId));
        await tx.delete(snapshotLineage).where(eq(snapshotLineage.childSnapshotId, snapshotId));
      });
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete incremental data',
      };
    }
  }
}
