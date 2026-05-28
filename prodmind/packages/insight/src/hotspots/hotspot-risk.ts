import type { HotspotIntelligence } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';

export function analyzeHotspotRisk(
  nodeId: string,
  intensity: number,
  dependencyCount: number,
  changeFrequency: number,
): { risk: number; severity: InsightSeverity; description: string } {
  const risk = intensity * 0.4 + Math.min(dependencyCount / 30, 1) * 0.3 + Math.min(changeFrequency / 10, 1) * 0.3;
  const severity: InsightSeverity = risk > 0.8 ? 'CRITICAL' : risk > 0.6 ? 'HIGH' : risk > 0.4 ? 'MODERATE' : 'LOW';
  return {
    risk,
    severity,
    description: `Hotspot risk for ${nodeId}: intensity ${intensity.toFixed(2)}, ${dependencyCount} deps, ${changeFrequency} changes`,
  };
}

export function assessHotspotCriticality(hotspots: HotspotIntelligence[]): HotspotIntelligence[] {
  return hotspots.map(h => ({
    ...h,
    risk: h.risk * (1 + (1 / h.ranking)),
  }));
}
