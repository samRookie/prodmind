import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope, determineTrend } from '../utils/index.ts';

export interface SemanticRegressionResult {
  hasRegression: boolean;
  semanticDeclineRate: number;
  currentSemanticScore: number;
  semanticTrend: string;
}

export function detectSemanticRegression(
  points: EvolutionPoint[],
): SemanticRegressionResult {
  if (points.length < 2) {
    return { hasRegression: false, semanticDeclineRate: 0, currentSemanticScore: 0, semanticTrend: 'insufficient_data' };
  }
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.semanticScore }));
  const slope = calculateSlope(semanticPoints);
  const trend = determineTrend(semanticPoints);
  const currentScore = points[points.length - 1]!.semanticScore;
  return {
    hasRegression: slope < 0,
    semanticDeclineRate: slope,
    currentSemanticScore: currentScore,
    semanticTrend: trend,
  };
}
