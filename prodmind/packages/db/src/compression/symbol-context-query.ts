import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { compressedFileContexts } from '../schema/compressed-file-contexts.ts';
import { safeJsonParse } from '../utils.ts';

export interface HighValueSymbolResult {
  id: string;
  name: string;
  type: string;
  visibility: 'exported' | 'internal';
  isAsync: boolean;
  dependencyCount: number;
  centralityScore: number;
  filePath: string;
}

export async function getHighValueSymbols(
  db: Database,
  snapshotId: string,
  minCentrality?: number,
): Promise<HighValueSymbolResult[]> {
  const rows = await db
    .select()
    .from(compressedFileContexts)
    .where(eq(compressedFileContexts.snapshotId, snapshotId))
    .orderBy(compressedFileContexts.filePath);

  const results: HighValueSymbolResult[] = [];

  for (const row of rows) {
    const symbols = safeJsonParse<Array<{
      id: string; name: string; type: string; visibility: 'exported' | 'internal';
      isAsync: boolean; dependencyCount: number; centralityScore: number;
    }>>(row.symbolsJson) ?? [];

    for (const sym of symbols) {
      if (minCentrality !== undefined && sym.centralityScore < minCentrality) continue;
      results.push({
        ...sym,
        filePath: row.filePath,
      });
    }
  }

  results.sort((a, b) => {
    const byCentrality = b.centralityScore - a.centralityScore;
    if (byCentrality !== 0) return byCentrality;
    return a.name.localeCompare(b.name);
  });

  return results;
}
