import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';
import type { TrendSignal } from './trend-detection.ts';

export function analyzeHotspotTrends(points: EvolutionPoint[]): TrendSignal {
  const hotspotPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.hotspotCount }));
  const values = hotspotPoints.map((p) => p.value);
  const slope = calculateSlope(hotspotPoints);
  return {
    metricName: 'hotspotCount',
    trend: determineTrend(hotspotPoints),
    slope,
    acceleration: calculateAcceleration(hotspotPoints),
    strength: Math.abs(slope) / (Math.max(...values, 1)),
    sustained: false,
  };
}
