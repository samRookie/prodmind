import type { HotspotEvolutionPoint } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, determineTrend } from '../utils/index.ts';

export interface HotspotTrajectoryResult {
  hotspotId: string;
  intensitySlope: number;
  intensityAcceleration: number;
  intensityTrend: string;
  riskTrajectory: 'escalating' | 'stable' | 'declining';
}

export function analyzeHotspotTrajectory(
  history: HotspotEvolutionPoint[],
): HotspotTrajectoryResult[] {
  const grouped = new Map<string, HotspotEvolutionPoint[]>();
  for (const h of history) {
    const existing = grouped.get(h.hotspotId) ?? [];
    existing.push(h);
    grouped.set(h.hotspotId, existing);
  }
  const results: HotspotTrajectoryResult[] = [];
  for (const [hotspotId, points] of grouped) {
    const intensityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.intensity }));
    const slope = calculateSlope(intensityPoints);
    const accel = calculateAcceleration(intensityPoints);
    const trend = determineTrend(intensityPoints);
    results.push({
      hotspotId,
      intensitySlope: slope,
      intensityAcceleration: accel,
      intensityTrend: trend,
      riskTrajectory: slope > 0.01 ? 'escalating' : slope < -0.01 ? 'declining' : 'stable',
    });
  }
  return results;
}
