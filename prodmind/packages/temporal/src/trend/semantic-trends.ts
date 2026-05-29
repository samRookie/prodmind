import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzeSemanticTrends(points: EvolutionPoint[]): TrendSignal {
  const semanticPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.semanticScore }));
  const values = semanticPoints.map((p) => p.value);
  const slope = calculateSlope(semanticPoints);
  return {
    metricName: 'semanticScore',
    trend: determineTrend(semanticPoints),
    slope,
    acceleration: calculateAcceleration(semanticPoints),
    strength: Math.abs(slope) / (Math.max(...values, 1)),
    sustained: false,
  };
}
