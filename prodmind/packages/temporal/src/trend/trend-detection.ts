import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, computeMovingAverage, determineTrend } from '../utils/index.ts';

export interface TrendSignal {
  metricName: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  acceleration: number;
  strength: number;
  sustained: boolean;
}

export function detectTrends(points: EvolutionPoint[]): TrendSignal[] {
  const metrics = ['nodeCount', 'edgeCount', 'complexity', 'instability', 'propagation', 'coupling', 'driftScore'] as const;
  return metrics.map((metric) => {
    const metricPoints = points.map((p) => ({
      timestamp: p.timestamp,
      value: p[metric] as number,
    }));
    const values = metricPoints.map((p) => p.value);
    const movingAvg = computeMovingAverage(values, Math.min(3, values.length));
    const sustained = movingAvg.length >= 3
      && movingAvg[movingAvg.length - 1]! > movingAvg[0]! * 1.1;
    const slope = calculateSlope(metricPoints);
    return {
      metricName: metric,
      trend: determineTrend(metricPoints),
      slope,
      acceleration: calculateAcceleration(metricPoints),
      strength: Math.abs(slope) / (Math.max(...values, 1)),
      sustained,
    };
  });
}
