import type { MetricTrajectory } from '../types/index.ts';

export interface TrajectoryScore {
  overallScore: number;
  metricScores: Array<{ metricName: string; score: number; trend: string }>;
}

export function scoreTrajectory(metrics: MetricTrajectory[]): TrajectoryScore {
  const metricScores = metrics.map((m) => {
    const absSlope = Math.abs(m.slope);
    const trendScore = m.trend === 'increasing' ? 0.8 : m.trend === 'decreasing' ? 0.3 : m.trend === 'volatile' ? 0.5 : 0.6;
    const slopeScore = Math.min(1, absSlope);
    const score = trendScore * 0.7 + (1 - slopeScore) * 0.3;
    return { metricName: m.metricName, score, trend: m.trend };
  });
  const overallScore = metricScores.length > 0
    ? metricScores.reduce((s, m) => s + m.score, 0) / metricScores.length
    : 0;
  return { overallScore, metricScores };
}
