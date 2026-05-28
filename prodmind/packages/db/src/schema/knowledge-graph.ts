import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const knowledgeGraph = sqliteTable(
  'knowledge_graph',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    nodeType: text('node_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_kg_snapshot').on(table.snapshotId),
    nodeTypeIdx: index('idx_kg_type').on(table.nodeType),
    fingerprintIdx: index('idx_kg_fingerprint').on(table.fingerprint),
  }),
);

export type KnowledgeGraphRow = typeof knowledgeGraph.$inferSelect;
export type NewKnowledgeGraphRow = typeof knowledgeGraph.$inferInsert;
