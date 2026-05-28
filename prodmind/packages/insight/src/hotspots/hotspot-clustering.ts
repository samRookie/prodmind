import type { HotspotIntelligence } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function clusterHotspots(
  hotspots: HotspotIntelligence[],
  nodeSimilarity: Map<string, string[]>,
): HotspotIntelligence[] {
  const clusterMap = new Map<string, string[]>();
  for (const h of hotspots) {
    const similar = nodeSimilarity.get(h.nodeId) ?? [];
    const clusterKey = similar.slice(0, 3).sort().join(',');
    const cluster = clusterMap.get(clusterKey) ?? [];
    cluster.push(h.nodeId);
    clusterMap.set(clusterKey, cluster);
  }
  const clusterIds = new Map<string, string>();
  for (const [, nodes] of clusterMap) {
    const cid = generateId('hotspot-cluster');
    for (const nodeId of nodes) clusterIds.set(nodeId, cid);
  }
  return hotspots.map(h => ({
    ...h,
    clusterIds: clusterIds.has(h.nodeId) ? [clusterIds.get(h.nodeId)!] : [],
  }));
}
