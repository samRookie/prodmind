import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.ts';

export const snapshotLineage = sqliteTable(
  'snapshot_lineage',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id),
    parentSnapshotId: text('parent_snapshot_id'),
    childSnapshotId: text('child_snapshot_id').notNull(),
    lineageType: text('lineage_type').notNull().default('DIRECT'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_sl_project_id').on(table.projectId),
    childSnapshotIdx: index('idx_sl_child_snapshot').on(table.childSnapshotId),
  }),
);

export type SnapshotLineage = typeof snapshotLineage.$inferSelect;
export type NewSnapshotLineage = typeof snapshotLineage.$inferInsert;
