import type { HotspotEvolutionPoint } from '../types/index.ts';

export interface HotspotPriority {
  modulePath: string;
  priority: number;
  intensity: number;
  riskScore: number;
}

export function prioritizeHotspots(hotspots: HotspotEvolutionPoint[]): HotspotPriority[] {
  return hotspots
    .map((h) => ({
      modulePath: h.modulePath,
      priority: h.intensity * 0.5 + h.riskScore * 0.3 + (h.affectedModules / 100) * 0.2,
      intensity: h.intensity,
      riskScore: h.riskScore,
    }))
    .sort((a, b) => b.priority - a.priority);
}
