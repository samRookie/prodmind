import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const cognitionIndexes = sqliteTable(
  'cognition_indexes',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    indexType: text('index_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_ci_snapshot').on(table.snapshotId),
    indexTypeIdx: index('idx_ci_type').on(table.indexType),
    fingerprintIdx: index('idx_ci_fingerprint').on(table.fingerprint),
  }),
);

export type CognitionIndexRow = typeof cognitionIndexes.$inferSelect;
export type NewCognitionIndexRow = typeof cognitionIndexes.$inferInsert;
