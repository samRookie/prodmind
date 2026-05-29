import type { EvolutionPoint } from '../types/index.ts';
import { calculateAcceleration,calculateSlope } from '../utils/index.ts';

export interface HotspotTrajectoryResult {
  hotspotCountTrajectory: Array<{ timestamp: string; value: number }>;
  hotspotGrowthRate: number;
  hotspotAcceleration: number;
  averageIntensityTrajectory: Array<{ timestamp: string; value: number }>;
}

export function analyzeHotspotTrajectory(points: EvolutionPoint[]): HotspotTrajectoryResult {
  const countPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.hotspotCount }));
  return {
    hotspotCountTrajectory: countPoints,
    hotspotGrowthRate: calculateSlope(countPoints),
    hotspotAcceleration: calculateAcceleration(countPoints),
    averageIntensityTrajectory: [],
  };
}
