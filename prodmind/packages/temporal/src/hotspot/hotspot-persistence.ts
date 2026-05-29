import type { HotspotEvolutionPoint } from '../types/index.ts';

export interface HotspotPersistenceResult {
  persistentHotspotCount: number;
  averagePersistenceCycles: number;
  mostPersistentHotspots: string[];
  persistenceRate: number;
}

export function analyzeHotspotPersistence(
  history: HotspotEvolutionPoint[],
): HotspotPersistenceResult {
  const grouped = new Map<string, HotspotEvolutionPoint[]>();
  for (const h of history) {
    const existing = grouped.get(h.hotspotId) ?? [];
    existing.push(h);
    grouped.set(h.hotspotId, existing);
  }
  const persistenceCycles = Array.from(grouped.entries()).map(([id, points]) => ({
    id,
    count: points.length,
  }));
  const persistent = persistenceCycles.filter((p) => p.count >= 3);
  const totalCycles = persistenceCycles.reduce((s, p) => s + p.count, 0);
  const sorted = [...persistenceCycles].sort((a, b) => b.count - a.count);
  return {
    persistentHotspotCount: persistent.length,
    averagePersistenceCycles: persistenceCycles.length > 0
      ? totalCycles / persistenceCycles.length
      : 0,
    mostPersistentHotspots: sorted.slice(0, 5).map((p) => p.id),
    persistenceRate: grouped.size > 0 ? persistent.length / grouped.size : 0,
  };
}
