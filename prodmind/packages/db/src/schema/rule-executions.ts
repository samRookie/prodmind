import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const ruleExecutions = sqliteTable(
  'rule_executions',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    ruleId: text('rule_id').notNull(),
    executionTimeMs: integer('execution_time_ms').notNull(),
    emittedInsightCount: integer('emitted_insight_count').notNull(),
    metadataJson: text('metadata_json'),
  },
  (table) => ({
    snapshotIdIdx: index('idx_re_snapshot_id').on(table.snapshotId),
    ruleIdIdx: index('idx_re_rule_id').on(table.ruleId),
    snapshotRuleIdx: index('idx_re_snapshot_rule').on(table.snapshotId, table.ruleId),
  }),
);

export type RuleExecution = typeof ruleExecutions.$inferSelect;
export type NewRuleExecution = typeof ruleExecutions.$inferInsert;
