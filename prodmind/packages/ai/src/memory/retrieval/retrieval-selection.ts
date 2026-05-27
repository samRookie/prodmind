import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';

export interface SelectionScore {
  readonly entryId: string;
  readonly totalScore: number;
  readonly dimensionScores: Readonly<Record<string, number>>;
}

export class RetrievalSelection {
  selectTopByScore(entries: readonly MemoryEntry[], scores: readonly SelectionScore[], maxCount: number): readonly MemoryEntry[] {
    const scoreMap = new Map(scores.map(s => [s.entryId, s]));
    const scored = entries
      .map(e => ({ entry: e, score: scoreMap.get(e.id)?.totalScore ?? 0 }))
      .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

    return Object.freeze(
      scored.slice(0, maxCount).map(s => s.entry),
    );
  }

  selectByDiversity(entries: readonly MemoryEntry[], maxCount: number): readonly MemoryEntry[] {
    const categories = new Map<string, MemoryEntry[]>();
    for (const entry of entries) {
      const existing = categories.get(entry.category) ?? [];
      existing.push(entry);
      categories.set(entry.category, existing);
    }

    const result: MemoryEntry[] = [];
    const catKeys = [...categories.keys()].sort();
    let idx = 0;

    while (result.length < maxCount && result.length < entries.length) {
      for (const cat of catKeys) {
        const catEntries = categories.get(cat)!;
        if (idx < catEntries.length) {
          result.push(catEntries[idx]!);
          if (result.length >= maxCount) break;
        }
      }
      idx++;
    }

    return Object.freeze(result.sort((a, b) => a.id.localeCompare(b.id)));
  }

  selectByRecency(entries: readonly MemoryEntry[], maxCount: number): readonly MemoryEntry[] {
    return Object.freeze(
      [...entries]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id))
        .slice(0, maxCount),
    );
  }

  selectFindingsBySeverity(findings: readonly ArchitecturalFinding[], maxCount: number): readonly ArchitecturalFinding[] {
    const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
    return Object.freeze(
      [...findings]
        .sort((a, b) => (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0) || a.id.localeCompare(b.id))
        .slice(0, maxCount),
    );
  }

  interpolate(entries: readonly MemoryEntry[], includeIds: readonly string[], maxCount: number): readonly MemoryEntry[] {
    const includeSet = new Set(includeIds);
    const mustInclude = entries.filter(e => includeSet.has(e.id));
    const remaining = entries.filter(e => !includeSet.has(e.id));
    const combined = [...mustInclude, ...remaining];
    return Object.freeze(combined.slice(0, maxCount));
  }
}
