import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    reportType: text('report_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    markdownContent: text('markdown_content'),
    jsonContent: text('json_content'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_rpt_snapshot_id').on(table.snapshotId),
    reportTypeIdx: index('idx_rpt_type').on(table.reportType),
    fingerprintIdx: index('idx_rpt_fingerprint').on(table.fingerprint),
  }),
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
