import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const invalidationRegions = sqliteTable(
  'invalidation_regions',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    regionType: text('region_type').notNull(),
    regionIdentifier: text('region_identifier').notNull(),
    invalidationReason: text('invalidation_reason').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdx: index('idx_ir_snapshot_id').on(table.snapshotId),
    regionTypeIdx: index('idx_ir_region_type').on(table.regionType),
  }),
);

export type InvalidationRegion = typeof invalidationRegions.$inferSelect;
export type NewInvalidationRegion = typeof invalidationRegions.$inferInsert;
