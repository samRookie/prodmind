import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const compressedRepositoryContexts = sqliteTable(
  'compressed_repository_contexts',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    architectureSummary: text('architecture_summary'),
    dependencyTopologySummary: text('dependency_topology_summary'),
    semanticDomainSummary: text('semantic_domain_summary'),
    infrastructureSummary: text('infrastructure_summary'),
    totalFiles: integer('total_files').notNull().default(0),
    totalModules: integer('total_modules').notNull().default(0),
    totalSymbols: integer('total_symbols').notNull().default(0),
    totalDependencies: integer('total_dependencies').notNull().default(0),
    languagesJson: text('languages_json'),
    modulesSummaryJson: text('modules_summary_json'),
    couplingHotspotsJson: text('coupling_hotspots_json'),
    isolatedSubsystemsJson: text('isolated_subsystems_json'),
    generatedAt: text('generated_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_crc_snapshot_id').on(table.snapshotId),
  }),
);

export type CompressedRepositoryContextRow = typeof compressedRepositoryContexts.$inferSelect;
export type NewCompressedRepositoryContextRow = typeof compressedRepositoryContexts.$inferInsert;
