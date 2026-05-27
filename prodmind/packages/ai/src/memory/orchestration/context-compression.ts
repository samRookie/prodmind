import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';

export interface CompressionResult {
  readonly entries: readonly MemoryEntry[];
  readonly findings: readonly ArchitecturalFinding[];
  readonly originalTokenCount: number;
  readonly compressedTokenCount: number;
  readonly ratio: number;
}

export class ContextCompression {
  compressByPriority(entries: readonly MemoryEntry[], maxTokens: number): CompressionResult {
    const originalTokens = this._totalTokens(entries);
    if (originalTokens <= maxTokens) {
      return this._noOp(entries, [], originalTokens);
    }

    const sorted = [...entries].sort((a, b) => {
      const aPri = this._computePriority(a);
      const bPri = this._computePriority(b);
      return bPri - aPri || a.id.localeCompare(b.id);
    });

    const compressed = this._greedySelect(sorted, maxTokens);
    const compressedTokens = this._totalTokens(compressed);

    return Object.freeze({
      entries: Object.freeze(compressed),
      findings: Object.freeze([]),
      originalTokenCount: originalTokens,
      compressedTokenCount: compressedTokens,
      ratio: compressedTokens / Math.max(1, originalTokens),
    });
  }

  compressByRelevance(entries: readonly MemoryEntry[], maxTokens: number, relevanceScores: Readonly<Record<string, number>>): CompressionResult {
    const originalTokens = this._totalTokens(entries);
    if (originalTokens <= maxTokens) {
      return this._noOp(entries, [], originalTokens);
    }

    const sorted = [...entries].sort((a, b) => {
      const aRel = relevanceScores[a.id] ?? 0;
      const bRel = relevanceScores[b.id] ?? 0;
      return bRel - aRel || a.id.localeCompare(b.id);
    });

    const compressed = this._greedySelect(sorted, maxTokens);
    const compressedTokens = this._totalTokens(compressed);

    return Object.freeze({
      entries: Object.freeze(compressed),
      findings: Object.freeze([]),
      originalTokenCount: originalTokens,
      compressedTokenCount: compressedTokens,
      ratio: compressedTokens / Math.max(1, originalTokens),
    });
  }

  compressFindings(findings: readonly ArchitecturalFinding[], maxCount: number): readonly ArchitecturalFinding[] {
    const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
    return Object.freeze(
      [...findings]
        .sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0) || a.id.localeCompare(b.id))
        .slice(0, maxCount),
    );
  }

  private _computePriority(entry: MemoryEntry): number {
    let priority = 0;
    if (entry.category === 'architectural') priority += 10;
    if (entry.category === 'metrics') priority += 5;
    if (entry.tags.includes('critical')) priority += 8;
    if (entry.tags.includes('warning')) priority += 4;
    return priority;
  }

  private _greedySelect(entries: MemoryEntry[], maxTokens: number): MemoryEntry[] {
    const result: MemoryEntry[] = [];
    let running = 0;
    for (const entry of entries) {
      const tokens = this._estimateTokenCount(entry);
      if (running + tokens <= maxTokens) {
        result.push(entry);
        running += tokens;
      }
    }
    return result;
  }

  private _estimateTokenCount(entry: MemoryEntry): number {
    return Math.ceil((entry.content.length + JSON.stringify(entry.metadata).length) / 4);
  }

  private _totalTokens(entries: readonly MemoryEntry[]): number {
    return entries.reduce((sum, e) => sum + this._estimateTokenCount(e), 0);
  }

  private _noOp(entries: readonly MemoryEntry[], findings: readonly ArchitecturalFinding[], tokens: number): CompressionResult {
    return Object.freeze({
      entries,
      findings,
      originalTokenCount: tokens,
      compressedTokenCount: tokens,
      ratio: 1,
    });
  }
}
