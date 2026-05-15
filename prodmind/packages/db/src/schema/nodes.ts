import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const nodes = sqliteTable(
  'nodes',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash'),
    nodeType: text('node_type').notNull(),
    symbolName: text('symbol_name'),
    language: text('language'),
    metadataJson: text('metadata_json'),
    summaryJson: text('summary_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_nodes_snapshot_id').on(table.snapshotId),
    fileHashIdx: index('idx_nodes_file_hash').on(table.fileHash),
    nodeTypeIdx: index('idx_nodes_node_type').on(table.nodeType),
    snapshotPathIdx: index('idx_nodes_snapshot_path').on(table.snapshotId, table.filePath),
  }),
);

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
