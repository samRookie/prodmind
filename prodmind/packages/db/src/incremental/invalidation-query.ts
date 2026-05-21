import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { invalidationRegions } from '../schema/invalidation-regions.ts';

export interface InvalidationRegionResult {
  id: string;
  snapshotId: string;
  regionType: string;
  regionIdentifier: string;
  invalidationReason: string;
  createdAt: string;
}

function rowToResult(row: typeof invalidationRegions.$inferSelect): InvalidationRegionResult {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    regionType: row.regionType,
    regionIdentifier: row.regionIdentifier,
    invalidationReason: row.invalidationReason,
    createdAt: row.createdAt,
  };
}

export async function getInvalidatedRegions(
  db: Database,
  snapshotId: string,
): Promise<InvalidationRegionResult[]> {
  const rows = await db
    .select()
    .from(invalidationRegions)
    .where(eq(invalidationRegions.snapshotId, snapshotId))
    .orderBy(invalidationRegions.regionType);

  return rows.map(rowToResult);
}

export async function getInvalidatedByType(
  db: Database,
  snapshotId: string,
  regionType: string,
): Promise<InvalidationRegionResult[]> {
  const rows = await db
    .select()
    .from(invalidationRegions)
    .where(
      and(
        eq(invalidationRegions.snapshotId, snapshotId),
        eq(invalidationRegions.regionType, regionType),
      ),
    )
    .orderBy(invalidationRegions.regionIdentifier);

  return rows.map(rowToResult);
}
