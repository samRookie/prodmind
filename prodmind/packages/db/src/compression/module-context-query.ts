import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { compressedModuleContexts } from '../schema/compressed-module-contexts.ts';
import { safeJsonParse } from '../utils.ts';

export interface CompressedModuleContextResult {
  modulePath: string;
  totalFiles: number;
  totalSymbols: number;
  exportedSymbols: number;
  internalSymbols: number;
  couplingLevel: string | null;
  boundaryType: string | null;
  filePaths: string[];
  dependencyModulePaths: string[];
  dependentModulePaths: string[];
  topSymbols: Array<{ id: string; name: string; type: string; visibility: string; isAsync: boolean; dependencyCount: number; centralityScore: number }>;
}

export async function getCompressedModuleContext(
  db: Database,
  snapshotId: string,
  modulePath: string,
): Promise<CompressedModuleContextResult | null> {
  const [row] = await db
    .select()
    .from(compressedModuleContexts)
    .where(
      and(
        eq(compressedModuleContexts.snapshotId, snapshotId),
        eq(compressedModuleContexts.modulePath, modulePath),
      ),
    )
    .limit(1);

  if (!row) return null;
  return rowToResult(row);
}

export async function getAllModuleContexts(
  db: Database,
  snapshotId: string,
): Promise<Map<string, CompressedModuleContextResult>> {
  const rows = await db
    .select()
    .from(compressedModuleContexts)
    .where(eq(compressedModuleContexts.snapshotId, snapshotId))
    .orderBy(compressedModuleContexts.modulePath);

  const result = new Map<string, CompressedModuleContextResult>();
  for (const row of rows) {
    result.set(row.modulePath, rowToResult(row));
  }
  return result;
}

function rowToResult(row: typeof compressedModuleContexts.$inferSelect): CompressedModuleContextResult {
  return {
    modulePath: row.modulePath,
    totalFiles: row.totalFiles,
    totalSymbols: row.totalSymbols,
    exportedSymbols: row.exportedSymbols,
    internalSymbols: row.internalSymbols,
    couplingLevel: row.couplingLevel,
    boundaryType: row.boundaryType,
    filePaths: safeJsonParse<string[]>(row.filePathsJson) ?? [],
    dependencyModulePaths: safeJsonParse<string[]>(row.dependencyModulesJson) ?? [],
    dependentModulePaths: safeJsonParse<string[]>(row.dependentModulesJson) ?? [],
    topSymbols: safeJsonParse<CompressedModuleContextResult['topSymbols']>(row.topSymbolsJson) ?? [],
  };
}
