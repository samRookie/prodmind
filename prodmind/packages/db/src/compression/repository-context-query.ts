import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { compressedRepositoryContexts } from '../schema/compressed-repository-contexts.ts';
import { safeJsonParse } from '../utils.ts';

export interface CompressedRepositoryContextResult {
  snapshotId: string;
  architectureSummary: string | null;
  dependencyTopologySummary: string | null;
  semanticDomainSummary: string | null;
  infrastructureSummary: string | null;
  totalFiles: number;
  totalModules: number;
  totalSymbols: number;
  totalDependencies: number;
  languages: string[];
  modules: Array<{
    modulePath: string; fileCount: number; symbolCount: number;
    dependencyCount: number; isIsolated: boolean; isHotspot: boolean;
  }>;
  couplingHotspots: string[];
  isolatedSubsystems: string[];
  generatedAt: string | null;
}

export async function getCompressedRepositoryContext(
  db: Database,
  snapshotId: string,
): Promise<CompressedRepositoryContextResult | null> {
  const [row] = await db
    .select()
    .from(compressedRepositoryContexts)
    .where(eq(compressedRepositoryContexts.snapshotId, snapshotId))
    .limit(1);

  if (!row) return null;

  return {
    snapshotId: row.snapshotId,
    architectureSummary: row.architectureSummary,
    dependencyTopologySummary: row.dependencyTopologySummary,
    semanticDomainSummary: row.semanticDomainSummary,
    infrastructureSummary: row.infrastructureSummary,
    totalFiles: row.totalFiles,
    totalModules: row.totalModules,
    totalSymbols: row.totalSymbols,
    totalDependencies: row.totalDependencies,
    languages: safeJsonParse<string[]>(row.languagesJson) ?? [],
    modules: safeJsonParse<CompressedRepositoryContextResult['modules']>(row.modulesSummaryJson) ?? [],
    couplingHotspots: safeJsonParse<string[]>(row.couplingHotspotsJson) ?? [],
    isolatedSubsystems: safeJsonParse<string[]>(row.isolatedSubsystemsJson) ?? [],
    generatedAt: row.generatedAt,
  };
}

export async function getCriticalDependencyChains(
  db: Database,
  snapshotId: string,
): Promise<string[]> {
  const context = await getCompressedRepositoryContext(db, snapshotId);
  if (!context?.dependencyTopologySummary) return [];

  return context.dependencyTopologySummary
    .split('; ')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function getCompressedTopologySummary(
  db: Database,
  snapshotId: string,
): Promise<string | null> {
  const context = await getCompressedRepositoryContext(db, snapshotId);
  return context?.dependencyTopologySummary ?? null;
}
