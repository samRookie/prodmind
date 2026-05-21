import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';
import { nodes } from './nodes.ts';

export const graphMetrics = sqliteTable(
  'graph_metrics',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    metricType: text('metric_type').notNull(),
    metricScope: text('metric_scope').notNull(),
    nodeId: text('node_id').references(() => nodes.id),
    metricValue: real('metric_value').notNull(),
    metricClassification: text('metric_classification'),
    metricPriority: text('metric_priority').notNull().default('LOW'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_gm_snapshot_id').on(table.snapshotId),
    metricTypeIdx: index('idx_gm_metric_type').on(table.metricType),
    nodeIdIdx: index('idx_gm_node_id').on(table.nodeId),
    priorityIdx: index('idx_gm_priority').on(table.metricPriority),
    snapshotTypeIdx: index('idx_gm_snapshot_type').on(table.snapshotId, table.metricType),
    snapshotNodeIdx: index('idx_gm_snapshot_node').on(table.snapshotId, table.nodeId),
    snapshotPriorityIdx: index('idx_gm_snapshot_priority').on(table.snapshotId, table.metricPriority),
  }),
);

export type GraphMetricsRow = typeof graphMetrics.$inferSelect;
export type NewGraphMetricsRow = typeof graphMetrics.$inferInsert;
