import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const searchIndexes = sqliteTable(
  'search_indexes',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    indexType: text('index_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_si_snapshot').on(table.snapshotId),
    indexTypeIdx: index('idx_si_type').on(table.indexType),
    fingerprintIdx: index('idx_si_fingerprint').on(table.fingerprint),
  }),
);

export type SearchIndexRow = typeof searchIndexes.$inferSelect;
export type NewSearchIndexRow = typeof searchIndexes.$inferInsert;
