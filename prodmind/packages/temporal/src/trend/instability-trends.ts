import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzeInstabilityTrends(points: EvolutionPoint[]): TrendSignal {
  const instabilityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.instability }));
  const values = instabilityPoints.map((p) => p.value);
  const slope = calculateSlope(instabilityPoints);
  return {
    metricName: 'instability',
    trend: determineTrend(instabilityPoints),
    slope,
    acceleration: calculateAcceleration(instabilityPoints),
    strength: Math.abs(slope) / (Math.max(...values, 1)),
    sustained: false,
  };
}
