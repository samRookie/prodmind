import type { MetricTrajectory } from '../types/index.ts';

export interface TrendPriority {
  metricName: string;
  priority: number;
  reason: string;
}

export function prioritizeTrends(trajectories: MetricTrajectory[]): TrendPriority[] {
  return trajectories
    .map((t) => {
      const slopeMagnitude = Math.abs(t.slope);
      const priority = t.trend === 'increasing' ? slopeMagnitude * 0.8
        : t.trend === 'decreasing' ? slopeMagnitude * 0.6
        : t.trend === 'volatile' ? 0.7
        : 0.2;
      return {
        metricName: t.metricName,
        priority,
        reason: `Trend: ${t.trend}, slope: ${t.slope.toFixed(4)}`,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}
