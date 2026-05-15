import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const insights = sqliteTable(
  'insights',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    category: text('category').notNull(),
    title: text('title').notNull(),
    contentJson: text('content_json').notNull(),
    reproducibilityFingerprintJson: text('reproducibility_fingerprint_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_insights_snapshot_id').on(table.snapshotId),
    categoryIdx: index('idx_insights_category').on(table.category),
  }),
);

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
