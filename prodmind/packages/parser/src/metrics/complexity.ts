import { ComplexityLevel } from '@prodmind/contracts';
import type { ComplexityResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { ComplexityError } from './metrics-errors.ts';
import { computeDepths } from './graph-analysis-cache.ts';

function computeEntropy(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const v of values) {
    if (v <= 0) continue;
    const p = v / total;
    entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

export function computeComplexity(cache: GraphAnalysisCache): ComplexityResult {
  try {
    const V = cache.sortedNodeIds.length;
    const E = cache.edges.length;
    const scc = cache.scc;

    const edgeNodeRatio = V > 0 ? E / V : 0;

    const depthMap = computeDepths(cache);
    const depths = Array.from(depthMap.values());
    const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

    const fanInValues: number[] = [];
    for (const fan of cache.fanMetrics.values()) {
      fanInValues.push(fan.fanIn);
    }
    const entropy = computeEntropy(fanInValues);

    const sccDensity = V > 0 && scc ? scc.componentCount / (V * V) : 0;

    let largestWeakComponent = 0;
    if (V > 0) {
      const weakAdj = new Map<string, Set<string>>();
      for (const nid of cache.sortedNodeIds) weakAdj.set(nid, new Set());
      for (const e of cache.edges) {
        weakAdj.get(e.sourceNodeId)?.add(e.targetNodeId);
        weakAdj.get(e.targetNodeId)?.add(e.sourceNodeId);
      }
      const visitedWeak = new Set<string>();
      for (const nid of cache.sortedNodeIds) {
        if (visitedWeak.has(nid)) continue;
        let size = 0;
        const queue = [nid];
        while (queue.length > 0) {
          const cur = queue.pop()!;
          if (visitedWeak.has(cur)) continue;
          visitedWeak.add(cur);
          size++;
          for (const next of weakAdj.get(cur) ?? []) {
            if (!visitedWeak.has(next)) queue.push(next);
          }
        }
        if (size > largestWeakComponent) largestWeakComponent = size;
      }
    }
    const fragmentation = V > 0 ? 1 - largestWeakComponent / V : 0;
    const fragmentationScore = fragmentation;

    const cycleNodes = new Set<string>();
    if (scc) {
      for (const [nid, compId] of scc.componentMap) {
        const compNodes = scc.componentNodes.get(compId) ?? [];
        if (compNodes.length > 1) cycleNodes.add(nid);
      }
    }
    const cycleScore = V > 0 ? cycleNodes.size / V : 0;

    const densityScore = Math.min(1, edgeNodeRatio / 5);
    const entropyScore = entropy;
    const depthScore = maxDepth > 0 ? Math.min(1, avgDepth / maxDepth) : 0;

    const finalScore = densityScore * 0.2 + entropyScore * 0.2 + fragmentationScore * 0.2 + cycleScore * 0.2 + depthScore * 0.2;

    let complexityLevel: ComplexityLevel;
    if (finalScore > 0.75) complexityLevel = ComplexityLevel.HIGHLY_COMPLEX;
    else if (finalScore > 0.5) complexityLevel = ComplexityLevel.COMPLEX;
    else if (finalScore > 0.25) complexityLevel = ComplexityLevel.MODERATE;
    else complexityLevel = ComplexityLevel.SIMPLE;

    return {
      densityScore: Number(densityScore.toFixed(4)),
      entropyScore: Number(entropyScore.toFixed(4)),
      fragmentationScore: Number(fragmentationScore.toFixed(4)),
      cycleScore: Number(cycleScore.toFixed(4)),
      depthScore: Number(depthScore.toFixed(4)),
      finalScore: Number(finalScore.toFixed(4)),
      complexityLevel,
      edgeNodeRatio: Number(edgeNodeRatio.toFixed(4)),
      sccDensity: Number(sccDensity.toFixed(6)),
      graphFragmentation: Number(fragmentation.toFixed(4)),
      architecturalEntropy: Number(entropy.toFixed(4)),
    };
  } catch (err) {
    throw new ComplexityError(
      err instanceof Error ? err.message : 'Complexity computation failed',
    );
  }
}
