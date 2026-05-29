import type { HotspotEvolutionPoint } from '../types/index.ts';
import { calculateSlope } from '../utils/index.ts';

export interface HotspotEmergenceResult {
  newHotspots: number;
  emergenceRate: number;
  averageEmergenceIntensity: number;
  highRiskEmergences: HotspotEvolutionPoint[];
}

export function analyzeHotspotEmergence(
  history: HotspotEvolutionPoint[],
): HotspotEmergenceResult {
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const seen = new Set<string>();
  const emergences: HotspotEvolutionPoint[] = [];
  for (const h of sorted) {
    if (!seen.has(h.hotspotId)) {
      seen.add(h.hotspotId);
      emergences.push(h);
    }
  }
  const intensities = emergences.map((h) => h.intensity);
  const avgIntensity = intensities.length > 0
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : 0;
  const highRisk = emergences.filter((h) => h.riskScore > 0.7);
  const timePoints = emergences.map((h, i) => ({
    timestamp: h.timestamp,
    value: i + 1,
  }));
  return {
    newHotspots: emergences.length,
    emergenceRate: calculateSlope(timePoints),
    averageEmergenceIntensity: avgIntensity,
    highRiskEmergences: highRisk,
  };
}
