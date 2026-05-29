import type { HotspotEvolutionPoint } from '../types/index.ts';
import { calculateAcceleration } from '../utils/index.ts';

export interface HotspotAccelerationResult {
  acceleratingHotspots: string[];
  averageAcceleration: number;
  maxAcceleration: number;
  criticalHotspots: string[];
}

export function analyzeHotspotAcceleration(
  history: HotspotEvolutionPoint[],
): HotspotAccelerationResult {
  const grouped = new Map<string, HotspotEvolutionPoint[]>();
  for (const h of history) {
    const existing = grouped.get(h.hotspotId) ?? [];
    existing.push(h);
    grouped.set(h.hotspotId, existing);
  }
  const acceleratingHotspots: string[] = [];
  const criticalHotspots: string[] = [];
  let totalAccel = 0;
  let maxAccel = 0;
  let count = 0;

  for (const [hotspotId, points] of grouped) {
    if (points.length < 3) continue;
    const intensityPoints = points.map((p) => ({ timestamp: p.timestamp, value: p.intensity }));
    const accel = calculateAcceleration(intensityPoints);
    totalAccel += accel;
    count++;
    if (accel > maxAccel) maxAccel = accel;
    if (accel > 0.001) acceleratingHotspots.push(hotspotId);
    if (accel > 0.01) criticalHotspots.push(hotspotId);
  }

  return {
    acceleratingHotspots,
    averageAcceleration: count > 0 ? totalAccel / count : 0,
    maxAcceleration: maxAccel,
    criticalHotspots,
  };
}
