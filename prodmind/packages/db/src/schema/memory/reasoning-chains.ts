import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const reasoningChains = sqliteTable(
  'reasoning_chains',
  {
    id: text('id').primaryKey(),
    chainType: text('chain_type').notNull(),
    conclusion: text('conclusion').notNull(),
    confidence: real('confidence').notNull().default(0),
    stepCount: integer('step_count').notNull().default(0),
    stepsJson: text('steps_json').notNull(),
    evidenceIdsJson: text('evidence_ids_json').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    chainTypeIdx: index('idx_reasoning_chain_type').on(table.chainType),
    fingerprintIdx: index('idx_reasoning_fingerprint').on(table.fingerprint),
  }),
);

export type ReasoningChainRow = typeof reasoningChains.$inferSelect;
export type NewReasoningChainRow = typeof reasoningChains.$inferInsert;
