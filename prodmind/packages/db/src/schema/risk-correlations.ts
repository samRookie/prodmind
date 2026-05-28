import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const riskCorrelations = sqliteTable(
  'risk_correlations',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    riskType: text('risk_type').notNull(),
    severity: text('severity').notNull(),
    normalizedScore: real('normalized_score').notNull(),
    fingerprint: text('fingerprint').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    impactedNodesJson: text('impacted_nodes_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_rc_snapshot_id').on(table.snapshotId),
    riskTypeIdx: index('idx_rc_risk_type').on(table.riskType),
    severityIdx: index('idx_rc_severity').on(table.severity),
    fingerprintIdx: index('idx_rc_fingerprint').on(table.fingerprint),
    snapshotRiskIdx: index('idx_rc_snapshot_risk').on(table.snapshotId, table.riskType),
  }),
);

export type RiskCorrelation = typeof riskCorrelations.$inferSelect;
export type NewRiskCorrelation = typeof riskCorrelations.$inferInsert;
