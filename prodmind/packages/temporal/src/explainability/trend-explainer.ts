import type { MetricTrajectory } from '../types/index.ts';

export interface TrendExplanation {
  summary: string;
  details: Array<{
    metric: string;
    direction: string;
    velocity: string;
    volatility: string;
  }>;
}

export function explainTrends(trajectories: MetricTrajectory[]): TrendExplanation {
  return {
    summary: `Identified trends across ${trajectories.length} metrics`,
    details: trajectories.map((t) => ({
      metric: t.metricName,
      direction: t.trend,
      velocity: `${t.slope > 0 ? '+' : ''}${t.slope.toFixed(4)}/ms`,
      volatility: `stddev=${t.volatility.toFixed(4)}`,
    })),
  };
}
