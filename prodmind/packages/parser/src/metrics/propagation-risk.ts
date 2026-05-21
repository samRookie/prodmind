import type { PropagationRiskResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { PropagationRiskError } from './metrics-errors.ts';

const MAX_TRAVERSAL_DEPTH = 3;
const MAX_CASCADE_NODES = 10_000;

function computeCascadeBFS(
  startNodeId: string,
  adj: Map<string, string[]>,
  weightMap: Map<string, Map<string, number>>,
  maxDepth: number,
): number {
  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ nodeId: string; depth: number; weight: number }> = [{ nodeId: startNodeId, depth: 0, weight: 1.0 }];
  let totalImpact = 0;

  let head = 0;
  while (head < queue.length) {
    if (visited.size > MAX_CASCADE_NODES) break;
    const current = queue[head]!;
    head++;

    if (current.depth >= maxDepth) continue;

    const neighbors = adj.get(current.nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      if (visited.size > MAX_CASCADE_NODES) break;
      const edgeWeight = weightMap.get(current.nodeId)?.get(neighbor) ?? 1.0;
      const childWeight = current.weight * edgeWeight;
      queue.push({ nodeId: neighbor, depth: current.depth + 1, weight: childWeight });
      totalImpact += childWeight;
    }
  }

  return totalImpact;
}

const cascadeCache = new Map<string, number>();

function getCachedCascade(
  nodeId: string,
  adj: Map<string, string[]>,
  weightMap: Map<string, Map<string, number>>,
  maxDepth: number,
): number {
  let cached = cascadeCache.get(nodeId);
  if (cached !== undefined) return cached;
  cached = computeCascadeBFS(nodeId, adj, weightMap, maxDepth);
  cascadeCache.set(nodeId, cached);
  return cached;
}

export function computePropagationRisk(cache: GraphAnalysisCache): PropagationRiskResult[] {
  try {
    cascadeCache.clear();
    const results: PropagationRiskResult[] = [];
    const V = cache.sortedNodeIds.length;
    const E = cache.edges.length;
    const normalizationFactor = Math.max(1, Math.log2(V + E));

    const weightMap = new Map<string, Map<string, number>>();
    for (const e of cache.edges) {
      if (!weightMap.has(e.sourceNodeId)) weightMap.set(e.sourceNodeId, new Map());
      weightMap.get(e.sourceNodeId)!.set(e.targetNodeId, e.weight ?? 1.0);
    }

    const avgDepth = (() => {
      let totalDepth = 0;
      let count = 0;
      for (const fan of cache.fanMetrics.values()) {
        totalDepth += fan.fanIn + fan.fanOut;
        count++;
      }
      return count > 0 ? totalDepth / count : 0;
    })();

    const globalDensity = V > 1 ? (2 * E) / (V * (V - 1)) : 0;

    for (const nodeId of cache.sortedNodeIds) {
      const fan = cache.fanMetrics.get(nodeId);
      if (!fan) continue;

      const filePath = cache.nodeIdToPath.get(nodeId) ?? '';

      const normalizedFanIn = V > 0 ? fan.fanIn / V : 0;
      const normalizedFanOut = V > 0 ? fan.fanOut / V : 0;
      const normalizedDepth = avgDepth > 0 ? Math.min(1, fan.fanIn + fan.fanOut / avgDepth) : 0;
      const couplingFactor = globalDensity;
      const cycleMembershipFactor = (() => {
        const compId = cache.scc?.componentMap.get(nodeId);
        if (compId === undefined) return 0;
        const compNodes = cache.scc?.componentNodes.get(compId) ?? [];
        return compNodes.length > 1 ? Math.min(1, compNodes.length / 10) : 0;
      })();

      const propagationPressure = Number(
        Math.min(1, (normalizedFanIn + normalizedFanOut + normalizedDepth + couplingFactor + cycleMembershipFactor) / normalizationFactor).toFixed(4),
      );

      const blastRadiusAmplification = Number(
        Math.min(1, globalDensity * normalizedFanOut).toFixed(4),
      );

      const cascadeEstimate = Number(
        Math.min(1, getCachedCascade(nodeId, cache.adjacency, weightMap, MAX_TRAVERSAL_DEPTH) / normalizationFactor).toFixed(4),
      );

      const isChokePoint = fan.fanIn >= 10 && fan.fanOut >= 10;

      results.push({
        nodeId,
        filePath,
        propagationPressure,
        blastRadiusAmplification,
        cascadeEstimate,
        isChokePoint,
      });
    }

    return results;
  } catch (err) {
    throw new PropagationRiskError(
      err instanceof Error ? err.message : 'Propagation risk computation failed',
    );
  }
}
