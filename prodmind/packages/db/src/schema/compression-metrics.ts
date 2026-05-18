import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const compressionMetrics = sqliteTable(
  'compression_metrics',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    compressionRatio: real('compression_ratio'),
    tokenReductionRatio: real('token_reduction_ratio'),
    preservedDependencyCount: integer('preserved_dependency_count').notNull().default(0),
    preservedSymbolCoverage: real('preserved_symbol_coverage'),
    preservedSemanticCoverage: real('preserved_semantic_coverage'),
    graphRetentionScore: real('graph_retention_score'),
    compressionConsistencyScore: real('compression_consistency_score'),
    originalTokenCount: integer('original_token_count').notNull().default(0),
    compressedTokenCount: integer('compressed_token_count').notNull().default(0),
    originalDependencyCount: integer('original_dependency_count').notNull().default(0),
    originalSymbolCount: integer('original_symbol_count').notNull().default(0),
    originalFileCount: integer('original_file_count').notNull().default(0),
    compressedDependencyCount: integer('compressed_dependency_count').notNull().default(0),
    compressedSymbolCount: integer('compressed_symbol_count').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_cm_snapshot_id').on(table.snapshotId),
  }),
);

export type CompressionMetricsRow = typeof compressionMetrics.$inferSelect;
export type NewCompressionMetricsRow = typeof compressionMetrics.$inferInsert;
