import type { SearchMatch, SearchIndexEntry } from './search-types.ts';

export interface RankWeights {
  exactMatch: number;
  prefixMatch: number;
  containsMatch: number;
}

const DEFAULT_WEIGHTS: RankWeights = {
  exactMatch: 10,
  prefixMatch: 5,
  containsMatch: 2,
};

export function rankMatches(entries: SearchIndexEntry[], term: string, mode: string, weights: RankWeights = DEFAULT_WEIGHTS): SearchMatch[] {
  const lowerTerm = term.toLowerCase();
  const scored = entries.map(entry => {
    const score = computeScore(entry, lowerTerm, mode, weights);
    return { entry, score };
  });

  const filtered = scored.filter(s => s.score > 0);
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map((s, i) => ({
    id: s.entry.id,
    label: s.entry.label,
    description: s.entry.description,
    score: s.score,
    rank: i + 1,
    type: s.entry.type,
    subsystem: s.entry.subsystem,
    severity: s.entry.severity,
    fingerprint: s.entry.fingerprint,
  }));
}

function computeScore(entry: SearchIndexEntry, term: string, mode: string, weights: RankWeights): number {
  let maxScore = 0;
  for (const token of entry.tokens) {
    let matchScore = 0;
    if (token === term) {
      matchScore = weights.exactMatch;
    } else if (token.startsWith(term) && mode !== 'EXACT') {
      matchScore = weights.prefixMatch;
    } else if (token.includes(term) && mode === 'CONTAINS') {
      matchScore = weights.containsMatch;
    }
    if (matchScore > maxScore) maxScore = matchScore;
  }
  if (maxScore === 0 && mode !== 'CONTAINS') {
    if (entry.label.toLowerCase().includes(term)) maxScore = weights.containsMatch;
  }
  return maxScore;
}
