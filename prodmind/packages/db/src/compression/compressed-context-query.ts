import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { compressedFileContexts } from '../schema/compressed-file-contexts.ts';
import { safeJsonParse } from '../utils.ts';

export interface CompressedFileContextResult {
  filePath: string;
  language: string | null;
  architecturalRole: string | null;
  semanticClassification: string | null;
  purpose: string | null;
  isAsync: boolean;
  dependencyCount: number;
  symbols: Array<{ id: string; name: string; type: string; visibility: string; isAsync: boolean; dependencyCount: number; centralityScore: number }>;
  imports: Array<{ source: string; specifiers: string[]; isExternal: boolean }>;
  exports: Array<{ name: string; isDefault: boolean }>;
  dependencyFilePaths: string[];
}

export async function getCompressedFileContext(
  db: Database,
  snapshotId: string,
  filePath: string,
): Promise<CompressedFileContextResult | null> {
  const [row] = await db
    .select()
    .from(compressedFileContexts)
    .where(
      and(
        eq(compressedFileContexts.snapshotId, snapshotId),
        eq(compressedFileContexts.filePath, filePath),
      ),
    )
    .limit(1);

  if (!row) return null;

  return rowToResult(row);
}

export async function getCompressedFileContextsBySnapshot(
  db: Database,
  snapshotId: string,
): Promise<CompressedFileContextResult[]> {
  const rows = await db
    .select()
    .from(compressedFileContexts)
    .where(eq(compressedFileContexts.snapshotId, snapshotId))
    .orderBy(compressedFileContexts.filePath);

  return rows.map(rowToResult);
}

function rowToResult(row: typeof compressedFileContexts.$inferSelect): CompressedFileContextResult {
  return {
    filePath: row.filePath,
    language: row.language,
    architecturalRole: row.architecturalRole,
    semanticClassification: row.semanticClassification,
    purpose: row.purpose,
    isAsync: row.isAsync,
    dependencyCount: row.dependencyCount,
    symbols: safeJsonParse<CompressedFileContextResult['symbols']>(row.symbolsJson) ?? [],
    imports: safeJsonParse<CompressedFileContextResult['imports']>(row.importsJson) ?? [],
    exports: safeJsonParse<CompressedFileContextResult['exports']>(row.exportsJson) ?? [],
    dependencyFilePaths: safeJsonParse<string[]>(row.dependencyPathsJson) ?? [],
  };
}
