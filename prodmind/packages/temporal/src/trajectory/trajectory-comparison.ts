import type { MetricTrajectory } from '../types/index.ts';

export interface TrajectoryComparisonResult {
  faster: string;
  slower: string;
  velocityDifference: number;
  accelerationDifference: number;
}

export function compareTrajectories(a: MetricTrajectory, b: MetricTrajectory): TrajectoryComparisonResult {
  const velocityDifference = a.slope - b.slope;
  const accelerationDifference = a.acceleration - b.acceleration;
  return {
    faster: velocityDifference >= 0 ? a.metricName : b.metricName,
    slower: velocityDifference >= 0 ? b.metricName : a.metricName,
    velocityDifference: Math.abs(velocityDifference),
    accelerationDifference: Math.abs(accelerationDifference),
  };
}

export function compareMultipleTrajectories(trajectories: MetricTrajectory[]): TrajectoryComparisonResult[] {
  const results: TrajectoryComparisonResult[] = [];
  for (let i = 0; i < trajectories.length; i++) {
    for (let j = i + 1; j < trajectories.length; j++) {
      results.push(compareTrajectories(trajectories[i]!, trajectories[j]!));
    }
  }
  return results;
}
