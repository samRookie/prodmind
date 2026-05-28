import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const architecturePatterns = sqliteTable(
  'architecture_patterns',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    patternType: text('pattern_type').notNull(),
    isAntiPattern: integer('is_anti_pattern', { mode: 'boolean' }).notNull().default(false),
    severity: text('severity').notNull(),
    confidence: real('confidence').notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    impactedNodesJson: text('impacted_nodes_json'),
    metricEvidenceJson: text('metric_evidence_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_ap_snapshot_id').on(table.snapshotId),
    patternTypeIdx: index('idx_ap_pattern_type').on(table.patternType),
    severityIdx: index('idx_ap_severity').on(table.severity),
    fingerprintIdx: index('idx_ap_fingerprint').on(table.fingerprint),
    snapshotPatternIdx: index('idx_ap_snapshot_pattern').on(table.snapshotId, table.patternType),
  }),
);

export type ArchitecturePattern = typeof architecturePatterns.$inferSelect;
export type NewArchitecturePattern = typeof architecturePatterns.$inferInsert;
