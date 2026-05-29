import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope, determineTrend } from '../utils/index.ts';

export interface PropagationRegressionResult {
  hasRegression: boolean;
  propagationGrowthRate: number;
  propagationTrend: string;
  cascadeRisk: number;
}

export function detectPropagationRegression(
  points: EvolutionPoint[],
): PropagationRegressionResult {
  if (points.length < 2) {
    return { hasRegression: false, propagationGrowthRate: 0, propagationTrend: 'insufficient_data', cascadeRisk: 0 };
  }
  const propPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.propagation }));
  const slope = calculateSlope(propPoints);
  const trend = determineTrend(propPoints);
  const lastPropagation = points[points.length - 1]!.propagation;
  return {
    hasRegression: slope > 0,
    propagationGrowthRate: slope,
    propagationTrend: trend,
    cascadeRisk: lastPropagation > 0.7 ? lastPropagation : 0,
  };
}
