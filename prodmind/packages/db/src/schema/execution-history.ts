import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const executionHistory = sqliteTable(
  'execution_history',
  {
    id: text('id').primaryKey(),
    correlationId: text('correlation_id').notNull(),
    promptId: text('prompt_id'),
    promptVersion: integer('prompt_version'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    renderedPrompt: text('rendered_prompt').notNull(),
    systemPrompt: text('system_prompt'),
    executionParamsJson: text('execution_params_json').notNull(),
    executionFingerprint: text('execution_fingerprint').notNull(),
    responseText: text('response_text'),
    responseJson: text('response_json'),
    tokenUsageJson: text('token_usage_json'),
    finishReason: text('finish_reason'),
    latencyMs: integer('latency_ms'),
    retryCount: integer('retry_count').notNull().default(0),
    status: text('status').notNull().default('success'),
    replayFingerprint: text('replay_fingerprint'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    correlationIdIdx: index('idx_eh_correlation_id').on(table.correlationId),
    promptIdIdx: index('idx_eh_prompt_id').on(table.promptId),
    providerIdx: index('idx_eh_provider').on(table.provider),
    fingerprintIdx: index('idx_eh_execution_fingerprint').on(table.executionFingerprint),
    createdAtIdx: index('idx_eh_created_at').on(table.createdAt),
  }),
);

export type ExecutionHistoryRow = typeof executionHistory.$inferSelect;
export type NewExecutionHistoryRow = typeof executionHistory.$inferInsert;
