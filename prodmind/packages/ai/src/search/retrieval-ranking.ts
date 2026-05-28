import type { SearchIndexEntry } from './search-types.ts';

export interface RetrievalScore {
  id: string;
  score: number;
  rank: number;
}

export function rankRetrieval(entries: SearchIndexEntry[], weights?: { severity?: number; recency?: number }): RetrievalScore[] {
  const w = { severity: 5, recency: 1, ...weights };
  const scored = entries.map(entry => {
    let score = 0;
    if (entry.severity === 'CRITICAL') score += 3 * w.severity;
    else if (entry.severity === 'HIGH') score += 2 * w.severity;
    else if (entry.severity === 'MODERATE') score += 1 * w.severity;
    return { id: entry.id, score, rank: 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
