import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status').notNull().default('PENDING'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    activeSnapshotId: text('active_snapshot_id'),
  },
  (table) => ({
    statusIdx: index('idx_projects_status').on(table.status),
  }),
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
