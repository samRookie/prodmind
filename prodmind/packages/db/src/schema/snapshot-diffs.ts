import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const snapshotDiffs = sqliteTable(
  'snapshot_diffs',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    baseSnapshotId: text('base_snapshot_id'),
    diffType: text('diff_type').notNull(),
    addedCount: integer('added_count').notNull().default(0),
    removedCount: integer('removed_count').notNull().default(0),
    modifiedCount: integer('modified_count').notNull().default(0),
    unchangedCount: integer('unchanged_count').notNull().default(0),
    detailsJson: text('details_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_sd_snapshot').on(table.snapshotId),
    diffTypeIdx: index('idx_sd_diff_type').on(table.diffType),
  }),
);

export type SnapshotDiffRow = typeof snapshotDiffs.$inferSelect;
export type NewSnapshotDiffRow = typeof snapshotDiffs.$inferInsert;
