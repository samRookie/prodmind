import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const cognitionSnapshots = sqliteTable(
  'cognition_snapshots',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    cognitionType: text('cognition_type').notNull(),
    healthScore: real('health_score').notNull(),
    healthLabel: text('health_label').notNull(),
    fingerprint: text('fingerprint').notNull(),
    architectureSummary: text('architecture_summary'),
    dominantRisksJson: text('dominant_risks_json'),
    dominantPatternsJson: text('dominant_patterns_json'),
    severityDistributionJson: text('severity_distribution_json'),
    summaryJson: text('summary_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_cs_snapshot_id').on(table.snapshotId),
    cognitionTypeIdx: index('idx_cs_cognition_type').on(table.cognitionType),
    fingerprintIdx: index('idx_cs_fingerprint').on(table.fingerprint),
    snapshotTypeIdx: index('idx_cs_snapshot_type').on(table.snapshotId, table.cognitionType),
  }),
);

export type CognitionSnapshot = typeof cognitionSnapshots.$inferSelect;
export type NewCognitionSnapshot = typeof cognitionSnapshots.$inferInsert;
