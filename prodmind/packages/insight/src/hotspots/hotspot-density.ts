import type { HotspotIntelligence } from '../types/index.ts';

export function calculateHotspotDensity(
  nodes: string[],
  edges: Array<{ source: string; target: string }>,
): Record<string, number> {
  const densityMap = new Map<string, number>();
  for (const node of nodes) {
    const connected = edges.filter(e => e.source === node || e.target === node);
    const localNodes = new Set<string>();
    for (const e of connected) {
      if (e.source !== node) localNodes.add(e.source);
      if (e.target !== node) localNodes.add(e.target);
    }
    densityMap.set(node, localNodes.size > 0 ? connected.length / localNodes.size : 0);
  }
  return Object.fromEntries(densityMap);
}

export function prioritizeHotspots(
  hotspots: HotspotIntelligence[],
  maxResults = 10,
): HotspotIntelligence[] {
  return [...hotspots]
    .sort((a, b) => (b.intensity * b.risk * (1 / b.ranking)) - (a.intensity * a.risk * (1 / a.ranking)))
    .slice(0, maxResults);
}
