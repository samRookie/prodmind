import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { compressedFileContexts } from '../schema/compressed-file-contexts.ts';
import { compressedModuleContexts } from '../schema/compressed-module-contexts.ts';
import { compressedRepositoryContexts } from '../schema/compressed-repository-contexts.ts';
import { compressionMetrics } from '../schema/compression-metrics.ts';
import { snapshots } from '../schema/snapshots.ts';
import { generateId, now } from '../utils.ts';
import type { CompressedFileContextRow, NewCompressedFileContextRow } from '../schema/compressed-file-contexts.ts';
import type { CompressedModuleContextRow, NewCompressedModuleContextRow } from '../schema/compressed-module-contexts.ts';
import type { CompressedRepositoryContextRow, NewCompressedRepositoryContextRow } from '../schema/compressed-repository-contexts.ts';
import type { CompressionMetricsRow, NewCompressionMetricsRow } from '../schema/compression-metrics.ts';
import type { Result } from '@prodmind/contracts';

export class CompressionRepository {
  constructor(private db: Database) {}

  async insertFileContexts(
    snapshotId: string,
    inputs: Omit<NewCompressedFileContextRow, 'id' | 'snapshotId' | 'createdAt'>[],
    txDb?: Database,
  ): Promise<Result<CompressedFileContextRow[], string>> {
    try {
      const dbc = txDb ?? this.db;
      const inserted: CompressedFileContextRow[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({
          id: generateId(),
          snapshotId,
          filePath: input.filePath,
          language: input.language ?? null,
          architecturalRole: input.architecturalRole ?? null,
          semanticClassification: input.semanticClassification ?? null,
          purpose: input.purpose ?? null,
          isAsync: input.isAsync ?? false,
          dependencyCount: input.dependencyCount ?? 0,
          symbolsJson: input.symbolsJson ?? null,
          importsJson: input.importsJson ?? null,
          exportsJson: input.exportsJson ?? null,
          dependencyPathsJson: input.dependencyPathsJson ?? null,
          createdAt: now(),
        }));
        const rows = await dbc.insert(compressedFileContexts).values(values).returning();
        inserted.push(...rows);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'File context insertion failed',
      };
    }
  }

  async insertModuleContexts(
    snapshotId: string,
    inputs: Omit<NewCompressedModuleContextRow, 'id' | 'snapshotId' | 'createdAt'>[],
    txDb?: Database,
  ): Promise<Result<CompressedModuleContextRow[], string>> {
    try {
      const dbc = txDb ?? this.db;
      const inserted: CompressedModuleContextRow[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({
          id: generateId(),
          snapshotId,
          modulePath: input.modulePath,
          totalFiles: input.totalFiles ?? 0,
          totalSymbols: input.totalSymbols ?? 0,
          exportedSymbols: input.exportedSymbols ?? 0,
          internalSymbols: input.internalSymbols ?? 0,
          couplingLevel: input.couplingLevel ?? null,
          boundaryType: input.boundaryType ?? null,
          filePathsJson: input.filePathsJson ?? null,
          dependencyModulesJson: input.dependencyModulesJson ?? null,
          dependentModulesJson: input.dependentModulesJson ?? null,
          topSymbolsJson: input.topSymbolsJson ?? null,
          createdAt: now(),
        }));
        const rows = await dbc.insert(compressedModuleContexts).values(values).returning();
        inserted.push(...rows);
      }
      return { success: true, data: inserted };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Module context insertion failed',
      };
    }
  }

  async insertRepositoryContext(
    snapshotId: string,
    input: Omit<NewCompressedRepositoryContextRow, 'id' | 'snapshotId' | 'createdAt'>,
    txDb?: Database,
  ): Promise<Result<CompressedRepositoryContextRow, string>> {
    try {
      const dbInstance = txDb ?? this.db;
      const [row] = await dbInstance
        .insert(compressedRepositoryContexts)
        .values({
          id: generateId(),
          snapshotId,
          architectureSummary: input.architectureSummary ?? null,
          dependencyTopologySummary: input.dependencyTopologySummary ?? null,
          semanticDomainSummary: input.semanticDomainSummary ?? null,
          infrastructureSummary: input.infrastructureSummary ?? null,
          totalFiles: input.totalFiles ?? 0,
          totalModules: input.totalModules ?? 0,
          totalSymbols: input.totalSymbols ?? 0,
          totalDependencies: input.totalDependencies ?? 0,
          languagesJson: input.languagesJson ?? null,
          modulesSummaryJson: input.modulesSummaryJson ?? null,
          couplingHotspotsJson: input.couplingHotspotsJson ?? null,
          isolatedSubsystemsJson: input.isolatedSubsystemsJson ?? null,
          generatedAt: input.generatedAt ?? null,
          createdAt: now(),
        })
        .returning();
      return { success: true, data: row! };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Repository context insertion failed',
      };
    }
  }

  async insertMetrics(
    snapshotId: string,
    input: Omit<NewCompressionMetricsRow, 'id' | 'snapshotId' | 'createdAt'>,
    txDb?: Database,
  ): Promise<Result<CompressionMetricsRow, string>> {
    try {
      const dbInstance = txDb ?? this.db;
      const [row] = await dbInstance
        .insert(compressionMetrics)
        .values({
          id: generateId(),
          snapshotId,
          compressionRatio: input.compressionRatio ?? null,
          tokenReductionRatio: input.tokenReductionRatio ?? null,
          preservedDependencyCount: input.preservedDependencyCount ?? 0,
          preservedSymbolCoverage: input.preservedSymbolCoverage ?? null,
          preservedSemanticCoverage: input.preservedSemanticCoverage ?? null,
          graphRetentionScore: input.graphRetentionScore ?? null,
          compressionConsistencyScore: input.compressionConsistencyScore ?? null,
          originalTokenCount: input.originalTokenCount ?? 0,
          compressedTokenCount: input.compressedTokenCount ?? 0,
          originalDependencyCount: input.originalDependencyCount ?? 0,
          originalSymbolCount: input.originalSymbolCount ?? 0,
          originalFileCount: input.originalFileCount ?? 0,
          compressedDependencyCount: input.compressedDependencyCount ?? 0,
          compressedSymbolCount: input.compressedSymbolCount ?? 0,
          createdAt: now(),
        })
        .returning();
      return { success: true, data: row! };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Metrics insertion failed',
      };
    }
  }

  async updateSnapshotCompressionRatio(snapshotId: string, ratio: number, txDb?: Database): Promise<Result<void, string>> {
    try {
      const dbInstance = txDb ?? this.db;
      await dbInstance
        .update(snapshots)
        .set({ compressionRatio: ratio })
        .where(eq(snapshots.id, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update compression ratio',
      };
    }
  }

  async getFileContextsBySnapshot(snapshotId: string): Promise<CompressedFileContextRow[]> {
    return this.db
      .select()
      .from(compressedFileContexts)
      .where(eq(compressedFileContexts.snapshotId, snapshotId))
      .orderBy(compressedFileContexts.filePath);
  }

  async getModuleContextsBySnapshot(snapshotId: string): Promise<CompressedModuleContextRow[]> {
    return this.db
      .select()
      .from(compressedModuleContexts)
      .where(eq(compressedModuleContexts.snapshotId, snapshotId))
      .orderBy(compressedModuleContexts.modulePath);
  }

  async getRepositoryContextBySnapshot(snapshotId: string): Promise<CompressedRepositoryContextRow | null> {
    const [result] = await this.db
      .select()
      .from(compressedRepositoryContexts)
      .where(eq(compressedRepositoryContexts.snapshotId, snapshotId))
      .limit(1);
    return result ?? null;
  }

  async getMetricsBySnapshot(snapshotId: string): Promise<CompressionMetricsRow | null> {
    const [result] = await this.db
      .select()
      .from(compressionMetrics)
      .where(eq(compressionMetrics.snapshotId, snapshotId))
      .limit(1);
    return result ?? null;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(compressionMetrics).where(eq(compressionMetrics.snapshotId, snapshotId));
        await tx.delete(compressedRepositoryContexts).where(eq(compressedRepositoryContexts.snapshotId, snapshotId));
        await tx.delete(compressedModuleContexts).where(eq(compressedModuleContexts.snapshotId, snapshotId));
        await tx.delete(compressedFileContexts).where(eq(compressedFileContexts.snapshotId, snapshotId));
      });
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete compression data',
      };
    }
  }
}
