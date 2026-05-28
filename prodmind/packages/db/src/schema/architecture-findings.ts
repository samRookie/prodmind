import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const architectureFindings = sqliteTable(
  'architecture_findings',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    findingFingerprint: text('finding_fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_af_snapshot_id').on(table.snapshotId),
    categoryIdx: index('idx_af_category').on(table.category),
    severityIdx: index('idx_af_severity').on(table.severity),
    fingerprintIdx: index('idx_af_fingerprint').on(table.findingFingerprint),
  }),
);

export type ArchitectureFinding = typeof architectureFindings.$inferSelect;
export type NewArchitectureFinding = typeof architectureFindings.$inferInsert;
