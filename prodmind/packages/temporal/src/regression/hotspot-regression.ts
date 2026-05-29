import type { EvolutionPoint } from '../types/index.ts';
import { calculateSlope, determineTrend } from '../utils/index.ts';

export interface HotspotRegressionResult {
  hasRegression: boolean;
  hotspotGrowthRate: number;
  currentHotspotCount: number;
  hotspotTrend: string;
}

export function detectHotspotRegression(
  points: EvolutionPoint[],
): HotspotRegressionResult {
  if (points.length < 2) {
    return { hasRegression: false, hotspotGrowthRate: 0, currentHotspotCount: 0, hotspotTrend: 'insufficient_data' };
  }
  const hotspotPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.hotspotCount }));
  const slope = calculateSlope(hotspotPoints);
  const trend = determineTrend(hotspotPoints);
  const currentCount = points[points.length - 1]!.hotspotCount;
  return {
    hasRegression: slope > 0,
    hotspotGrowthRate: slope,
    currentHotspotCount: currentCount,
    hotspotTrend: trend,
  };
}
