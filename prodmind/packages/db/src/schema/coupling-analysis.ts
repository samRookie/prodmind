import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';
import { nodes } from './nodes.ts';

export const couplingEdges = sqliteTable(
  'coupling_edges',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    sourceNodeId: text('source_node_id').notNull().references(() => nodes.id),
    targetNodeId: text('target_node_id').notNull().references(() => nodes.id),
    couplingType: text('coupling_type').notNull(),
    couplingStrength: real('coupling_strength').notNull(),
    propagationRisk: real('propagation_risk'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_ce_snapshot_id').on(table.snapshotId),
    sourceIdx: index('idx_ce_source').on(table.sourceNodeId),
    targetIdx: index('idx_ce_target').on(table.targetNodeId),
    couplingTypeIdx: index('idx_ce_coupling_type').on(table.couplingType),
    snapshotSourceIdx: index('idx_ce_snapshot_source').on(table.snapshotId, table.sourceNodeId),
    snapshotTargetIdx: index('idx_ce_snapshot_target').on(table.snapshotId, table.targetNodeId),
  }),
);

export type CouplingEdgeRow = typeof couplingEdges.$inferSelect;
export type NewCouplingEdgeRow = typeof couplingEdges.$inferInsert;
