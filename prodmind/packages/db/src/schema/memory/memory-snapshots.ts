import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const memorySnapshots = sqliteTable(
  'memory_snapshots',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    fingerprint: text('fingerprint').notNull(),
    entryCount: integer('entry_count').notNull().default(0),
    findingCount: integer('finding_count').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    payloadJson: text('payload_json').notNull(),
    createdAt: text('created_at').notNull(),
    metadataJson: text('metadata_json'),
  },
  (table) => ({
    parentIdIdx: index('idx_mem_snap_parent').on(table.parentId),
    fingerprintIdx: index('idx_mem_snap_fingerprint').on(table.fingerprint),
    createdAtIdx: index('idx_mem_snap_created').on(table.createdAt),
  }),
);

export type MemorySnapshotRow = typeof memorySnapshots.$inferSelect;
export type NewMemorySnapshotRow = typeof memorySnapshots.$inferInsert;
