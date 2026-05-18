import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { snapshotLineage } from '../schema/snapshot-lineage.ts';
import { snapshots } from '../schema/snapshots.ts';
import { SnapshotStatus } from '@prodmind/contracts';

export interface SnapshotLineageResult {
  lineageId: string;
  projectId: string;
  parentSnapshotId: string | null;
  childSnapshotId: string;
  lineageType: string;
  createdAt: string;
}

function rowToResult(row: typeof snapshotLineage.$inferSelect): SnapshotLineageResult {
  return {
    lineageId: row.id,
    projectId: row.projectId,
    parentSnapshotId: row.parentSnapshotId,
    childSnapshotId: row.childSnapshotId,
    lineageType: row.lineageType,
    createdAt: row.createdAt,
  };
}

export async function getSnapshotLineage(
  db: Database,
  projectId: string,
): Promise<SnapshotLineageResult[]> {
  const rows = await db
    .select()
    .from(snapshotLineage)
    .where(eq(snapshotLineage.projectId, projectId))
    .orderBy(snapshotLineage.createdAt);

  return rows.map(rowToResult);
}

export async function getPreviousSnapshotId(
  db: Database,
  projectId: string,
  currentSnapshotId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(
      and(
        eq(snapshots.projectId, projectId),
        eq(snapshots.status, SnapshotStatus.ACTIVE),
      ),
    )
    .orderBy(snapshots.version)
    .limit(1);

  if (row && row.id !== currentSnapshotId) {
    return row.id;
  }

  const lineageRow = await db
    .select()
    .from(snapshotLineage)
    .where(eq(snapshotLineage.childSnapshotId, currentSnapshotId))
    .limit(1);

  return lineageRow[0]?.parentSnapshotId ?? null;
}
