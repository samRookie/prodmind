import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const knowledgeRelations = sqliteTable(
  'knowledge_relations',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    relationType: text('relation_type').notNull(),
    sourceId: text('source_id').notNull(),
    targetId: text('target_id').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_kr_snapshot').on(table.snapshotId),
    relationTypeIdx: index('idx_kr_type').on(table.relationType),
    sourceIdIdx: index('idx_kr_source').on(table.sourceId),
    targetIdIdx: index('idx_kr_target').on(table.targetId),
    fingerprintIdx: index('idx_kr_fingerprint').on(table.fingerprint),
  }),
);

export type KnowledgeRelationRow = typeof knowledgeRelations.$inferSelect;
export type NewKnowledgeRelationRow = typeof knowledgeRelations.$inferInsert;
