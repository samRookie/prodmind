import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface NodeSemanticRegion {
  nodeId: string;
  region: string;
}

export function detectSemanticLeakage(
  nodeRegions: NodeSemanticRegion[],
  edges: Array<{ source: string; target: string }>,
  sameRegionEdges: number,
  threshold = 0.3,
): AntiPatternResult[] {
  const nodeToRegion = new Map(nodeRegions.map(n => [n.nodeId, n.region]));
  const regionPairs = new Map<string, number>();

  for (const edge of edges) {
    const fromRegion = nodeToRegion.get(edge.source);
    const toRegion = nodeToRegion.get(edge.target);
    if (fromRegion && toRegion && fromRegion !== toRegion) {
      const key = `${fromRegion}:${toRegion}`;
      regionPairs.set(key, (regionPairs.get(key) ?? 0) + 1);
    }
  }

  const results: AntiPatternResult[] = [];
  for (const [pair, count] of regionPairs) {
    const ratio = sameRegionEdges > 0 ? count / sameRegionEdges : 0;
    if (ratio > threshold) {
      const [from, to] = pair.split(':');
      const severity: InsightSeverity = ratio > 0.5 ? 'HIGH' : 'MODERATE';
      const id = generateId('semantic-leak');
      results.push({
        id,
        pattern: 'semantic-leakage',
        severity,
        confidence: 0.75 + ratio * 0.2,
        description: `Semantic leakage detected: ${from} -> ${to} (${count} edges, ${(ratio * 100).toFixed(1)}% cross-region)`,
        nodes: [],
        edges: [],
        metrics: { crossRegionEdges: count, ratio },
        evidence: [],
      });
    }
  }
  return results;
}
