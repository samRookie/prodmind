import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { incrementalMetrics } from '../schema/incremental-metrics.ts';

export interface IncrementalMetricsQueryResult {
  id: string;
  snapshotId: string;
  baseSnapshotId: string | null;
  reusedNodeCount: number;
  recomputedNodeCount: number;
  reusedEdgeCount: number;
  recomputedEdgeCount: number;
  reusedFileContextCount: number;
  recomputedFileContextCount: number;
  reusedModuleContextCount: number;
  recomputedModuleContextCount: number;
  incrementalSavingsRatio: number | null;
  recomputationReductionRatio: number | null;
  traversalReductionRatio: number | null;
  totalPreviousNodes: number;
  totalPreviousEdges: number;
  totalCurrentNodes: number;
  totalCurrentEdges: number;
  createdAt: string;
}

function rowToResult(row: typeof incrementalMetrics.$inferSelect): IncrementalMetricsQueryResult {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    baseSnapshotId: row.baseSnapshotId,
    reusedNodeCount: row.reusedNodeCount,
    recomputedNodeCount: row.recomputedNodeCount,
    reusedEdgeCount: row.reusedEdgeCount,
    recomputedEdgeCount: row.recomputedEdgeCount,
    reusedFileContextCount: row.reusedFileContextCount,
    recomputedFileContextCount: row.recomputedFileContextCount,
    reusedModuleContextCount: row.reusedModuleContextCount,
    recomputedModuleContextCount: row.recomputedModuleContextCount,
    incrementalSavingsRatio: row.incrementalSavingsRatio,
    recomputationReductionRatio: row.recomputationReductionRatio,
    traversalReductionRatio: row.traversalReductionRatio,
    totalPreviousNodes: row.totalPreviousNodes,
    totalPreviousEdges: row.totalPreviousEdges,
    totalCurrentNodes: row.totalCurrentNodes,
    totalCurrentEdges: row.totalCurrentEdges,
    createdAt: row.createdAt,
  };
}

export async function getIncrementalMetrics(
  db: Database,
  snapshotId: string,
): Promise<IncrementalMetricsQueryResult | null> {
  const [row] = await db
    .select()
    .from(incrementalMetrics)
    .where(eq(incrementalMetrics.snapshotId, snapshotId))
    .limit(1);

  return row ? rowToResult(row) : null;
}
