import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const validationResults = sqliteTable(
  'validation_results',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    category: text('category').notNull(),
    severity: text('severity').notNull(),
    state: text('state').notNull(),
    issueCode: text('issue_code').notNull(),
    message: text('message').notNull(),
    nodeId: text('node_id'),
    edgeId: text('edge_id'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_vr_snapshot_id').on(table.snapshotId),
    severityIdx: index('idx_vr_severity').on(table.severity),
    categoryIdx: index('idx_vr_category').on(table.category),
    stateIdx: index('idx_vr_state').on(table.state),
    snapshotSeverityIdx: index('idx_vr_snapshot_severity').on(table.snapshotId, table.severity),
  }),
);

export const snapshotIntegrity = sqliteTable(
  'snapshot_integrity',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    integrityScore: real('integrity_score').notNull(),
    readinessScore: real('readiness_score').notNull(),
    validationState: text('validation_state').notNull(),
    criticalIssueCount: integer('critical_issue_count').notNull().default(0),
    warningCount: integer('warning_count').notNull().default(0),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_si_snapshot_id').on(table.snapshotId),
    validationStateIdx: index('idx_si_validation_state').on(table.validationState),
  }),
);

export type ValidationResultRow = typeof validationResults.$inferSelect;
export type NewValidationResultRow = typeof validationResults.$inferInsert;
export type SnapshotIntegrityRow = typeof snapshotIntegrity.$inferSelect;
export type NewSnapshotIntegrityRow = typeof snapshotIntegrity.$inferInsert;
