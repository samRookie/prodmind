import type { InsightScores, ScoringConfig } from '../types/index.ts';

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  confidenceWeight: 0.25,
  severityWeight: 0.25,
  impactWeight: 0.25,
  urgencyWeight: 0.15,
  complexityWeight: 0.1,
};

export function computeOverallScore(
  scores: Omit<InsightScores, 'overall'>,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): number {
  return (
    scores.confidence * config.confidenceWeight +
    (scores.severity / 4) * config.severityWeight +
    scores.impact * config.impactWeight +
    scores.urgency * config.urgencyWeight +
    scores.complexity * config.complexityWeight
  );
}

export function computeImpactScore(
  blastRadius: number,
  cascadeProbability: number,
  criticalNodes: number,
): number {
  return Math.min(
    blastRadius / 30 * 0.3 +
    cascadeProbability * 0.4 +
    Math.min(criticalNodes / 5, 1) * 0.3,
    1,
  );
}

export function computeConfidenceScore(
  evidencePoints: number,
  deterministic: boolean,
  reproducible: boolean,
): number {
  let score = Math.min(evidencePoints / 10, 1) * 0.6;
  if (deterministic) score += 0.2;
  if (reproducible) score += 0.2;
  return Math.min(score, 1);
}

export function rankInsightsByRisk(
  insights: Array<{ id: string; scores: InsightScores }>,
): Array<{ id: string; riskScore: number }> {
  return insights
    .map(i => ({
      id: i.id,
      riskScore: i.scores.overall * i.scores.confidence * (i.scores.severity / 4),
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
}
