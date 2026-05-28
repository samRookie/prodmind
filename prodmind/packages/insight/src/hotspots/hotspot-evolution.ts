import type { HotspotIntelligence } from '../types/index.ts';

export interface EvolutionSnapshot {
  timestamp: string;
  hotspots: HotspotIntelligence[];
}

export function analyzeHotspotEvolution(
  snapshots: EvolutionSnapshot[],
): { hotspotId: string; trend: 'increasing' | 'decreasing' | 'stable'; intensityDelta: number }[] {
  if (snapshots.length < 2) return [];
  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;
  const firstMap = new Map(first.hotspots.map(h => [h.nodeId, h.intensity]));
  const lastMap = new Map(last.hotspots.map(h => [h.nodeId, h.intensity]));
  const results: Array<{ hotspotId: string; trend: 'increasing' | 'decreasing' | 'stable'; intensityDelta: number }> = [];
  for (const [nodeId, lastIntensity] of lastMap) {
    const firstIntensity = firstMap.get(nodeId);
    if (firstIntensity !== undefined) {
      const delta = lastIntensity - firstIntensity;
      results.push({
        hotspotId: nodeId,
        trend: delta > 0.1 ? 'increasing' : delta < -0.1 ? 'decreasing' : 'stable',
        intensityDelta: delta,
      });
    }
  }
  return results;
}
