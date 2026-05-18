import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { snapshotDiffs } from '../schema/snapshot-diffs.ts';

export interface SnapshotDiffQueryResult {
  id: string;
  snapshotId: string;
  baseSnapshotId: string | null;
  diffType: string;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  detailsJson: string | null;
  createdAt: string;
}

function rowToResult(row: typeof snapshotDiffs.$inferSelect): SnapshotDiffQueryResult {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    baseSnapshotId: row.baseSnapshotId,
    diffType: row.diffType,
    addedCount: row.addedCount,
    removedCount: row.removedCount,
    modifiedCount: row.modifiedCount,
    unchangedCount: row.unchangedCount,
    detailsJson: row.detailsJson,
    createdAt: row.createdAt,
  };
}

export async function getSnapshotDiffsBySnapshot(
  db: Database,
  snapshotId: string,
): Promise<SnapshotDiffQueryResult[]> {
  const rows = await db
    .select()
    .from(snapshotDiffs)
    .where(eq(snapshotDiffs.snapshotId, snapshotId))
    .orderBy(snapshotDiffs.diffType);

  return rows.map(rowToResult);
}

export async function getSnapshotDiffByType(
  db: Database,
  snapshotId: string,
  diffType: string,
): Promise<SnapshotDiffQueryResult | null> {
  const [row] = await db
    .select()
    .from(snapshotDiffs)
    .where(
      and(
        eq(snapshotDiffs.snapshotId, snapshotId),
        eq(snapshotDiffs.diffType, diffType),
      ),
    )
    .limit(1);

  return row ? rowToResult(row) : null;
}
