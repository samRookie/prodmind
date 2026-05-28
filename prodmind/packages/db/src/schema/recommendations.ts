import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const recommendations = sqliteTable(
  'recommendations',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    priority: text('priority').notNull(),
    priorityScore: real('priority_score').notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    rationale: text('rationale'),
    impactedNodesJson: text('impacted_nodes_json'),
    remediationJson: text('remediation_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_rec_snapshot_id').on(table.snapshotId),
    categoryIdx: index('idx_rec_category').on(table.category),
    severityIdx: index('idx_rec_severity').on(table.severity),
    priorityIdx: index('idx_rec_priority').on(table.priority),
    fingerprintIdx: index('idx_rec_fingerprint').on(table.fingerprint),
    snapshotSeverityIdx: index('idx_rec_snapshot_severity').on(table.snapshotId, table.severity),
  }),
);

export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
