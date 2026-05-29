import type { MetricTrajectory } from '../types/index.ts';

export interface ComplexityRegressionResult {
  hasRegression: boolean;
  complexityGrowthRate: number;
  acceleration: number;
  thresholdBreached: boolean;
  threshold: number;
}

export function detectComplexityRegression(
  trajectory: MetricTrajectory,
  threshold?: number,
): ComplexityRegressionResult {
  const thr = threshold ?? 100;
  const lastValue = trajectory.points.length > 0
    ? trajectory.points[trajectory.points.length - 1]!.value
    : 0;
  return {
    hasRegression: trajectory.trend === 'increasing' && trajectory.slope > 0,
    complexityGrowthRate: trajectory.slope,
    acceleration: trajectory.acceleration,
    thresholdBreached: lastValue > thr,
    threshold: thr,
  };
}
