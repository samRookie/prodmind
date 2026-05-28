import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const cognitionTimeseries = sqliteTable(
  'cognition_timeseries',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    cognitionType: text('cognition_type').notNull(),
    timeseriesFingerprint: text('timeseries_fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_ct_snapshot_id').on(table.snapshotId),
    cognitionTypeIdx: index('idx_ct_cognition_type').on(table.cognitionType),
    fingerprintIdx: index('idx_ct_fingerprint').on(table.timeseriesFingerprint),
  }),
);

export type CognitionTimeseries = typeof cognitionTimeseries.$inferSelect;
export type NewCognitionTimeseries = typeof cognitionTimeseries.$inferInsert;
