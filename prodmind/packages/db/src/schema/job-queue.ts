import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const jobQueue = sqliteTable(
  'job_queue',
  {
    id: text('id').primaryKey(),
    jobType: text('job_type').notNull(),
    payloadJson: text('payload_json'),
    priority: integer('priority').notNull().default(0),
    status: text('status').notNull().default('QUEUED'),
    retryCount: integer('retry_count').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    statusIdx: index('idx_job_queue_status').on(table.status),
    priorityIdx: index('idx_job_queue_priority').on(table.priority),
    statusPriorityIdx: index('idx_job_queue_status_priority').on(table.status, table.priority),
  }),
);

export type JobQueue = typeof jobQueue.$inferSelect;
export type NewJobQueue = typeof jobQueue.$inferInsert;
