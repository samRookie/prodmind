import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const architectureDiffs = sqliteTable(
  'architecture_diffs',
  {
    id: text('id').primaryKey(),
    previousSnapshotId: text('previous_snapshot_id').notNull().references(() => snapshots.id),
    currentSnapshotId: text('current_snapshot_id').notNull().references(() => snapshots.id),
    diffType: text('diff_type').notNull(),
    severity: text('severity').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    previousSnapshotIdIdx: index('idx_ad_prev_snap').on(table.previousSnapshotId),
    currentSnapshotIdIdx: index('idx_ad_curr_snap').on(table.currentSnapshotId),
    diffTypeIdx: index('idx_ad_diff_type').on(table.diffType),
    severityIdx: index('idx_ad_severity').on(table.severity),
    fingerprintIdx: index('idx_ad_fingerprint').on(table.fingerprint),
    snapshotPairIdx: index('idx_ad_pair').on(table.previousSnapshotId, table.currentSnapshotId),
  }),
);

export type ArchitectureDiff = typeof architectureDiffs.$inferSelect;
export type NewArchitectureDiff = typeof architectureDiffs.$inferInsert;
