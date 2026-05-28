import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const narratives = sqliteTable(
  'narratives',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    narrativeType: text('narrative_type').notNull(),
    severity: text('severity').notNull(),
    fingerprint: text('fingerprint').notNull(),
    summary: text('summary').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_narr_snapshot_id').on(table.snapshotId),
    narrativeTypeIdx: index('idx_narr_type').on(table.narrativeType),
    severityIdx: index('idx_narr_severity').on(table.severity),
    fingerprintIdx: index('idx_narr_fingerprint').on(table.fingerprint),
  }),
);

export type Narrative = typeof narratives.$inferSelect;
export type NewNarrative = typeof narratives.$inferInsert;
