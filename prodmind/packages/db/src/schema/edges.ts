import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';
import { nodes } from './nodes.ts';

export const edges = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    sourceNodeId: text('source_node_id').notNull().references(() => nodes.id),
    targetNodeId: text('target_node_id').notNull().references(() => nodes.id),
    edgeType: text('edge_type').notNull(),
    weight: real('weight').default(1.0),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_edges_snapshot_id').on(table.snapshotId),
    edgeTypeIdx: index('idx_edges_edge_type').on(table.edgeType),
    sourceIdx: index('idx_edges_source').on(table.sourceNodeId),
    targetIdx: index('idx_edges_target').on(table.targetNodeId),
    snapshotEdgeTypeIdx: index('idx_edges_snapshot_type').on(table.snapshotId, table.edgeType),
    snapshotSourceIdx: index('idx_edges_snapshot_source').on(table.snapshotId, table.sourceNodeId),
    snapshotTargetIdx: index('idx_edges_snapshot_target').on(table.snapshotId, table.targetNodeId),
  }),
);

export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;
