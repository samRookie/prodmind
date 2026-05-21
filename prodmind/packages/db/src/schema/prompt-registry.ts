import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const promptRegistry = sqliteTable(
  'prompt_registry',
  {
    id: text('id').primaryKey(),
    promptId: text('prompt_id').notNull(),
    version: integer('version').notNull(),
    promptType: text('prompt_type').notNull(),
    template: text('template').notNull(),
    checksum: text('checksum').notNull(),
    status: text('status').notNull().default('draft'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    promptIdIdx: index('idx_pr_prompt_id').on(table.promptId),
    promptTypeIdx: index('idx_pr_prompt_type').on(table.promptType),
    statusIdx: index('idx_pr_status').on(table.status),
  }),
);

export type PromptRegistryRow = typeof promptRegistry.$inferSelect;
export type NewPromptRegistryRow = typeof promptRegistry.$inferInsert;
