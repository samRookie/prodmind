import type { HotspotEvolutionPoint } from '../types/index.ts';

export interface HotspotEvolutionResult {
  totalHotspots: number;
  activeHotspots: number;
  resolvedHotspots: number;
  emergenceRate: number;
  averageLifespan: number;
}

export function analyzeHotspotEvolution(
  history: HotspotEvolutionPoint[],
): HotspotEvolutionResult {
  const unique = new Set(history.map((h) => h.hotspotId));
  const active = new Set(
    history.filter((h) => h.intensity > 0.5).map((h) => h.hotspotId),
  );
  const resolved = new Set(
    history.filter((h) => h.intensity <= 0.2).map((h) => h.hotspotId),
  );
  return {
    totalHotspots: unique.size,
    activeHotspots: active.size,
    resolvedHotspots: resolved.size,
    emergenceRate: 0,
    averageLifespan: 0,
  };
}
