import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const contextEnvelopes = sqliteTable(
  'context_envelopes',
  {
    id: text('id').primaryKey(),
    entryIdsJson: text('entry_ids_json').notNull(),
    findingIdsJson: text('finding_ids_json'),
    chainIdsJson: text('chain_ids_json'),
    totalTokens: integer('total_tokens').notNull().default(0),
    budget: integer('budget').notNull().default(8192),
    overflow: integer('overflow', { mode: 'boolean' }).notNull().default(false),
    fingerprint: text('fingerprint').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    fingerprintIdx: index('idx_env_fingerprint').on(table.fingerprint),
    budgetIdx: index('idx_env_budget').on(table.budget),
    createdAtIdx: index('idx_env_created').on(table.createdAt),
  }),
);

export type ContextEnvelopeRow = typeof contextEnvelopes.$inferSelect;
export type NewContextEnvelopeRow = typeof contextEnvelopes.$inferInsert;
