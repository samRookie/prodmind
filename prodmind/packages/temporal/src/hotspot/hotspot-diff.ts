import type { HotspotEvolutionPoint } from '../types/index.ts';

export interface HotspotDiffResult {
  emerged: HotspotEvolutionPoint[];
  resolved: HotspotEvolutionPoint[];
  persisted: HotspotEvolutionPoint[];
  intensityChanges: Record<string, number>;
}

export function diffHotspots(
  earlier: HotspotEvolutionPoint[],
  later: HotspotEvolutionPoint[],
): HotspotDiffResult {
  const earlierMap = new Map(earlier.map((h) => [h.hotspotId, h]));
  const laterMap = new Map(later.map((h) => [h.hotspotId, h]));

  const emerged: HotspotEvolutionPoint[] = [];
  const resolved: HotspotEvolutionPoint[] = [];
  const persisted: HotspotEvolutionPoint[] = [];
  const intensityChanges: Record<string, number> = {};

  for (const current of later) {
    const prev = earlierMap.get(current.hotspotId);
    if (!prev) {
      emerged.push(current);
    } else {
      persisted.push(current);
      intensityChanges[current.hotspotId] = current.intensity - prev.intensity;
    }
  }

  for (const prev of earlier) {
    if (!laterMap.has(prev.hotspotId)) {
      resolved.push(prev);
    }
  }

  return { emerged, resolved, persisted, intensityChanges };
}
