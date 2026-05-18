import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const compressedModuleContexts = sqliteTable(
  'compressed_module_contexts',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    modulePath: text('module_path').notNull(),
    totalFiles: integer('total_files').notNull().default(0),
    totalSymbols: integer('total_symbols').notNull().default(0),
    exportedSymbols: integer('exported_symbols').notNull().default(0),
    internalSymbols: integer('internal_symbols').notNull().default(0),
    couplingLevel: text('coupling_level'),
    boundaryType: text('boundary_type'),
    filePathsJson: text('file_paths_json'),
    dependencyModulesJson: text('dependency_modules_json'),
    dependentModulesJson: text('dependent_modules_json'),
    topSymbolsJson: text('top_symbols_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_cmc_snapshot_id').on(table.snapshotId),
    snapshotModuleIdx: index('idx_cmc_snapshot_module').on(table.snapshotId, table.modulePath),
  }),
);

export type CompressedModuleContextRow = typeof compressedModuleContexts.$inferSelect;
export type NewCompressedModuleContextRow = typeof compressedModuleContexts.$inferInsert;
