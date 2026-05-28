import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const graphInsights = sqliteTable(
  'graph_insights',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    insightType: text('insight_type').notNull(),
    severity: text('severity').notNull(),
    scope: text('scope').notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_gi_snapshot_id').on(table.snapshotId),
    insightTypeIdx: index('idx_gi_insight_type').on(table.insightType),
    severityIdx: index('idx_gi_severity').on(table.severity),
    fingerprintIdx: index('idx_gi_fingerprint').on(table.fingerprint),
    snapshotTypeIdx: index('idx_gi_snapshot_type').on(table.snapshotId, table.insightType),
    snapshotSeverityIdx: index('idx_gi_snapshot_severity').on(table.snapshotId, table.severity),
  }),
);

export type GraphInsight = typeof graphInsights.$inferSelect;
export type NewGraphInsight = typeof graphInsights.$inferInsert;
