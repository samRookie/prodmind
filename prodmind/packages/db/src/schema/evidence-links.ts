import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const evidenceLinks = sqliteTable(
  'evidence_links',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    insightId: text('insight_id').notNull(),
    nodeId: text('node_id'),
    edgeId: text('edge_id'),
    metricType: text('metric_type'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_el_snapshot_id').on(table.snapshotId),
    insightIdIdx: index('idx_el_insight_id').on(table.insightId),
    nodeIdIdx: index('idx_el_node_id').on(table.nodeId),
    snapshotInsightIdx: index('idx_el_snapshot_insight').on(table.snapshotId, table.insightId),
  }),
);

export type EvidenceLink = typeof evidenceLinks.$inferSelect;
export type NewEvidenceLink = typeof evidenceLinks.$inferInsert;
