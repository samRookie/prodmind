import type { CentralityResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { computeReachabilityCounts } from './graph-analysis-cache.ts';
import { CentralityError } from './metrics-errors.ts';

const UTILITY_DAMPEN_FACTOR = 0.65;

function isUtilityHub(cache: GraphAnalysisCache, nodeId: string): boolean {
  const fan = cache.fanMetrics.get(nodeId);
  if (!fan) return false;
  return fan.fanOut >= 20 && fan.fanIn <= 5;
}

export function computeCentrality(cache: GraphAnalysisCache): CentralityResult[] {
  try {
    const reachabilityCounts = computeReachabilityCounts(cache);
    const results: CentralityResult[] = [];

    let maxInfluence = 0;
    const influences = new Map<string, number>();

    for (const nodeId of cache.sortedNodeIds) {
      const fan = cache.fanMetrics.get(nodeId);
      if (!fan) continue;

      const reachability = reachabilityCounts.get(nodeId) ?? 0;
      const totalNodes = cache.sortedNodeIds.length;
      const reachabilityFactor = totalNodes > 0 ? reachability / totalNodes : 0;

      const cyclePenalty = (() => {
        const compId = cache.scc?.componentMap.get(nodeId);
        if (compId === undefined) return 1.0;
        const compNodes = cache.scc?.componentNodes.get(compId) ?? [];
        return compNodes.length > 1 ? 0.85 : 1.0;
      })();

      let influence = (fan.fanIn * 0.7 + fan.fanOut * 0.3) * reachabilityFactor * cyclePenalty;

      if (isUtilityHub(cache, nodeId)) {
        influence *= UTILITY_DAMPEN_FACTOR;
      }

      influences.set(nodeId, influence);
      if (influence > maxInfluence) maxInfluence = influence;
    }

    for (const nodeId of cache.sortedNodeIds) {
      const fan = cache.fanMetrics.get(nodeId);
      if (!fan) continue;

      const reachability = reachabilityCounts.get(nodeId) ?? 0;
      const influence = influences.get(nodeId) ?? 0;
      const normalizedInfluence = maxInfluence > 0 ? influence / maxInfluence : 0;

      results.push({
        nodeId,
        filePath: cache.nodeIdToPath.get(nodeId) ?? '',
        inDegree: fan.fanIn,
        outDegree: fan.fanOut,
        reachabilityCount: reachability,
        dependencyInfluenceScore: Number(normalizedInfluence.toFixed(4)),
        isUtilityHub: isUtilityHub(cache, nodeId),
      });
    }

    return results;
  } catch (err) {
    throw new CentralityError(
      err instanceof Error ? err.message : 'Centrality computation failed',
    );
  }
}
