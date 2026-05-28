import type { RiskCorrelation } from './risk-types.ts';

export function rankRisks(correlations: RiskCorrelation[]): RiskCorrelation[] {
  return [...correlations].sort((a, b) => {
    const byScore = b.normalizedScore - a.normalizedScore;
    if (byScore !== 0) return byScore;
    const bySeverity = b.severity.localeCompare(a.severity);
    if (bySeverity !== 0) return bySeverity;
    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

export function topRisks(correlations: RiskCorrelation[], count: number): RiskCorrelation[] {
  return rankRisks(correlations).slice(0, count);
}
