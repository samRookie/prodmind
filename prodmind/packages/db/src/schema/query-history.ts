import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const queryHistory = sqliteTable(
  'query_history',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    queryType: text('query_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_qh_snapshot').on(table.snapshotId),
    queryTypeIdx: index('idx_qh_type').on(table.queryType),
    fingerprintIdx: index('idx_qh_fingerprint').on(table.fingerprint),
  }),
);

export type QueryHistory = typeof queryHistory.$inferSelect;
export type NewQueryHistory = typeof queryHistory.$inferInsert;
