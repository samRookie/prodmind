import type { HotspotIntelligence } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function rankHotspots(
  nodeScores: Array<{ nodeId: string; score: number; risk: number }>,
  maxResults = 20,
): HotspotIntelligence[] {
  const sorted = [...nodeScores].sort((a, b) => b.score - a.score);
  return sorted.slice(0, maxResults).map((item, i) => ({
    id: generateId('hotspot-rank'),
    hotspotType: 'general',
    nodeId: item.nodeId,
    intensity: item.score,
    ranking: i + 1,
    risk: item.risk,
    description: `Hotspot #${i + 1}: ${item.nodeId} (intensity: ${item.score.toFixed(3)}, risk: ${item.risk.toFixed(3)})`,
    clusterIds: [],
    metrics: { score: item.score, risk: item.risk },
  }));
}
