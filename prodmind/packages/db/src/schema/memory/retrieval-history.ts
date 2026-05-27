import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const retrievalHistory = sqliteTable(
  'retrieval_history',
  {
    id: text('id').primaryKey(),
    queryId: text('query_id').notNull(),
    entryCount: integer('entry_count').notNull().default(0),
    findingCount: integer('finding_count').notNull().default(0),
    totalScore: real('total_score').notNull().default(0),
    durationMs: integer('duration_ms').notNull().default(0),
    fingerprint: text('fingerprint'),
    queryParamsJson: text('query_params_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    queryIdIdx: index('idx_retrieval_query_id').on(table.queryId),
    durationIdx: index('idx_retrieval_duration').on(table.durationMs),
    createdAtIdx: index('idx_retrieval_created').on(table.createdAt),
  }),
);

export type RetrievalHistoryRow = typeof retrievalHistory.$inferSelect;
export type NewRetrievalHistoryRow = typeof retrievalHistory.$inferInsert;
