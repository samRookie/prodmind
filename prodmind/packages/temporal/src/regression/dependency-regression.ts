import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope, determineTrend } from '../utils/index.ts';

export interface DependencyRegressionResult {
  hasRegression: boolean;
  dependencyGrowthRate: number;
  currentCoupling: number;
  dependencyTrend: string;
}

export function detectDependencyRegression(
  points: EvolutionPoint[],
): DependencyRegressionResult {
  if (points.length < 2) {
    return { hasRegression: false, dependencyGrowthRate: 0, currentCoupling: 0, dependencyTrend: 'insufficient_data' };
  }
  const couplingPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.coupling }));
  const slope = calculateSlope(couplingPoints);
  const trend = determineTrend(couplingPoints);
  const currentCoupling = points[points.length - 1]!.coupling;
  return {
    hasRegression: slope > 0,
    dependencyGrowthRate: slope,
    currentCoupling,
    dependencyTrend: trend,
  };
}
