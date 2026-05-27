import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const memoryEntries = sqliteTable(
  'memory_entries',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull(),
    category: text('category').notNull(),
    content: text('content').notNull(),
    fingerprint: text('fingerprint').notNull(),
    tagsJson: text('tags_json').notNull().default('[]'),
    metadataJson: text('metadata_json'),
    provenanceId: text('provenance_id'),
    parentId: text('parent_id'),
    timestamp: text('timestamp').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_mem_entries_snapshot').on(table.snapshotId),
    categoryIdx: index('idx_mem_entries_category').on(table.category),
    fingerprintIdx: index('idx_mem_entries_fingerprint').on(table.fingerprint),
    provenanceIdx: index('idx_mem_entries_provenance').on(table.provenanceId),
    catSnapIdx: index('idx_mem_entries_cat_snap').on(table.category, table.snapshotId),
  }),
);

export type MemoryEntryRow = typeof memoryEntries.$inferSelect;
export type NewMemoryEntryRow = typeof memoryEntries.$inferInsert;
