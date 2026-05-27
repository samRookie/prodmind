import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

export const memoryRelations = sqliteTable(
  'memory_relations',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    targetId: text('target_id').notNull(),
    relationType: text('relation_type').notNull(),
    weight: real('weight').notNull().default(1),
    timestamp: text('timestamp').notNull(),
    snapshotId: text('snapshot_id'),
  },
  (table) => ({
    sourceIdx: index('idx_mem_rel_source').on(table.sourceId),
    targetIdx: index('idx_mem_rel_target').on(table.targetId),
    typeIdx: index('idx_mem_rel_type').on(table.relationType),
    sourceTargetIdx: index('idx_mem_rel_src_tgt').on(table.sourceId, table.targetId),
  }),
);

export type MemoryRelationRow = typeof memoryRelations.$inferSelect;
export type NewMemoryRelationRow = typeof memoryRelations.$inferInsert;
