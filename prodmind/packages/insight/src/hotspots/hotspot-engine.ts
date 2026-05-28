import type { HotspotIntelligence } from '../types/index.ts';
import { clusterHotspots } from './hotspot-clustering.ts';
import { prioritizeHotspots } from './hotspot-density.ts';
import { rankHotspots } from './hotspot-ranking.ts';
import { analyzeHotspotRisk } from './hotspot-risk.ts';

export class HotspotEngine {
  analyze(
    nodeScores: Array<{ nodeId: string; score: number; risk: number }>,
    nodeSimilarity?: Map<string, string[]>,
  ): HotspotIntelligence[] {
    let hotspots = rankHotspots(nodeScores);
    hotspots = hotspots.map(h => {
      const nodeScore = nodeScores.find(n => n.nodeId === h.nodeId);
      const riskInfo = analyzeHotspotRisk(h.nodeId, h.intensity, 0, 0);
      return { ...h, risk: nodeScore?.risk ?? riskInfo.risk };
    });
    if (nodeSimilarity) {
      hotspots = clusterHotspots(hotspots, nodeSimilarity);
    }
    return prioritizeHotspots(hotspots);
  }
}
