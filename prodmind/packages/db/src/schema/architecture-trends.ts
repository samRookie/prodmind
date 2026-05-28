import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const architectureTrends = sqliteTable(
  'architecture_trends',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    trendType: text('trend_type').notNull(),
    direction: text('direction').notNull(),
    severity: text('severity').notNull(),
    normalizedSeverity: real('normalized_severity').notNull(),
    growthRate: real('growth_rate').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_at_snapshot_id').on(table.snapshotId),
    trendTypeIdx: index('idx_at_trend_type').on(table.trendType),
    directionIdx: index('idx_at_direction').on(table.direction),
    severityIdx: index('idx_at_severity').on(table.severity),
    fingerprintIdx: index('idx_at_fingerprint').on(table.fingerprint),
  }),
);

export type ArchitectureTrend = typeof architectureTrends.$inferSelect;
export type NewArchitectureTrend = typeof architectureTrends.$inferInsert;
