import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const incrementalMetrics = sqliteTable(
  'incremental_metrics',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    baseSnapshotId: text('base_snapshot_id'),
    reusedNodeCount: integer('reused_node_count').notNull().default(0),
    recomputedNodeCount: integer('recomputed_node_count').notNull().default(0),
    reusedEdgeCount: integer('reused_edge_count').notNull().default(0),
    recomputedEdgeCount: integer('recomputed_edge_count').notNull().default(0),
    reusedFileContextCount: integer('reused_file_context_count').notNull().default(0),
    recomputedFileContextCount: integer('recomputed_file_context_count').notNull().default(0),
    reusedModuleContextCount: integer('reused_module_context_count').notNull().default(0),
    recomputedModuleContextCount: integer('recomputed_module_context_count').notNull().default(0),
    incrementalSavingsRatio: real('incremental_savings_ratio'),
    recomputationReductionRatio: real('recomputation_reduction_ratio'),
    traversalReductionRatio: real('traversal_reduction_ratio'),
    totalPreviousNodes: integer('total_previous_nodes').notNull().default(0),
    totalPreviousEdges: integer('total_previous_edges').notNull().default(0),
    totalCurrentNodes: integer('total_current_nodes').notNull().default(0),
    totalCurrentEdges: integer('total_current_edges').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdx: index('idx_im_snapshot_id').on(table.snapshotId),
  }),
);

export type IncrementalMetricsRow = typeof incrementalMetrics.$inferSelect;
export type NewIncrementalMetricsRow = typeof incrementalMetrics.$inferInsert;
