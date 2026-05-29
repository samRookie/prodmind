import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzePropagationTrends(points: EvolutionPoint[]): TrendSignal {
  const propagationPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.propagation }));
  const values = propagationPoints.map((p) => p.value);
  const slope = calculateSlope(propagationPoints);
  return {
    metricName: 'propagation',
    trend: determineTrend(propagationPoints),
    slope,
    acceleration: calculateAcceleration(propagationPoints),
    strength: Math.abs(slope) / (Math.max(...values, 1)),
    sustained: false,
  };
}
