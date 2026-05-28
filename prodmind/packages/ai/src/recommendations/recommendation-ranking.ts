import type { Recommendation } from './recommendation-types.ts';

export function rankRecommendations(recommendations: Recommendation[]): Recommendation[] {
  return [...recommendations].sort((a, b) => {
    const byScore = b.priorityScore - a.priorityScore;
    if (byScore !== 0) return byScore;
    const bySeverity = b.severity.localeCompare(a.severity);
    if (bySeverity !== 0) return bySeverity;
    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

export function topRecommendations(recommendations: Recommendation[], count: number): Recommendation[] {
  return rankRecommendations(recommendations).slice(0, count);
}
