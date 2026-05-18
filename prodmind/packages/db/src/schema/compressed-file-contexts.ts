import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const compressedFileContexts = sqliteTable(
  'compressed_file_contexts',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    filePath: text('file_path').notNull(),
    language: text('language'),
    architecturalRole: text('architectural_role'),
    semanticClassification: text('semantic_classification'),
    purpose: text('purpose'),
    isAsync: integer('is_async', { mode: 'boolean' }).notNull().default(false),
    dependencyCount: integer('dependency_count').notNull().default(0),
    symbolsJson: text('symbols_json'),
    importsJson: text('imports_json'),
    exportsJson: text('exports_json'),
    dependencyPathsJson: text('dependency_paths_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_cfc_snapshot_id').on(table.snapshotId),
    snapshotFileIdx: index('idx_cfc_snapshot_file').on(table.snapshotId, table.filePath),
  }),
);

export type CompressedFileContextRow = typeof compressedFileContexts.$inferSelect;
export type NewCompressedFileContextRow = typeof compressedFileContexts.$inferInsert;
