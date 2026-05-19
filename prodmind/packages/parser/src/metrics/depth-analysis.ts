import type { DepthResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { computeDepths } from './graph-analysis-cache.ts';
import { DepthAnalysisError } from './metrics-errors.ts';

export function computeDepthAnalysis(cache: GraphAnalysisCache): DepthResult {
  try {
    const depthMap = computeDepths(cache);
    const depths = Array.from(depthMap.values());
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const avgDepth = depths.length > 0
      ? depths.reduce((a, b) => a + b, 0) / depths.length
      : 0;

    const depthBins = [
      { range: '0', min: 0, max: 0, count: 0 },
      { range: '1-2', min: 1, max: 2, count: 0 },
      { range: '3-5', min: 3, max: 5, count: 0 },
      { range: '6-10', min: 6, max: 10, count: 0 },
      { range: '>10', min: 11, max: Infinity, count: 0 },
    ];

    for (const d of depths) {
      for (const bin of depthBins) {
        if (d >= bin.min && d <= bin.max) {
          bin.count++;
          break;
        }
      }
    }

    const chainLengths = [...new Set(depths)].sort((a, b) => a - b);

    const deepestChains: Array<{ source: string; target: string; length: number }> = [];
    if (cache.scc) {
      const condensationDAG = cache.scc.condensationDAG;
      const depthMemo = new Map<number, number>();
      for (let i = cache.scc.componentCount - 1; i >= 0; i--) {
        let maxChild = 0;
        for (const child of condensationDAG.get(i) ?? []) {
          const childDepth = depthMemo.get(child) ?? 0;
          if (childDepth > maxChild) maxChild = childDepth;
        }
        depthMemo.set(i, maxChild + 1);
      }
      const maxDepthValue = maxDepth;
      if (maxDepthValue > 0) {
        for (let i = 0; i < cache.scc.componentCount; i++) {
          if ((depthMemo.get(i) ?? 0) === maxDepthValue) {
            const nodes = cache.scc.componentNodes.get(i) ?? [];
            const parents: Array<{ comp: number; depth: number }> = [];
            for (let j = 0; j < cache.scc.componentCount; j++) {
              if (condensationDAG.get(j)?.has(i)) {
                parents.push({ comp: j, depth: depthMemo.get(j) ?? 0 });
              }
            }
            parents.sort((a, b) => b.depth - a.depth);
            if (parents.length > 0) {
              const sourceNodes = cache.scc.componentNodes.get(parents[0]!.comp) ?? [];
              if (sourceNodes.length > 0 && nodes.length > 0) {
                deepestChains.push({
                  source: sourceNodes[0]!,
                  target: nodes[0]!,
                  length: maxDepthValue,
                });
              }
            }
          }
        }
      }
    }

    const hasExcessivelyDeepChains = maxDepth > 10;

    const layeringViolations: Array<{ sourceId: string; targetId: string; reason: string }> = [];
    for (const e of cache.edges) {
      const srcDepth = depthMap.get(e.sourceNodeId) ?? 0;
      const tgtDepth = depthMap.get(e.targetNodeId) ?? 0;
      if (tgtDepth > 0 && srcDepth > tgtDepth) {
        const srcFan = cache.fanMetrics.get(e.sourceNodeId);
        const tgtFan = cache.fanMetrics.get(e.targetNodeId);
        if (srcFan && tgtFan && tgtFan.fanIn < srcFan.fanOut) {
          layeringViolations.push({
            sourceId: e.sourceNodeId,
            targetId: e.targetNodeId,
            reason: `source depth ${srcDepth} > target depth ${tgtDepth} with unstable dependency`,
          });
        }
      }
    }

    return {
      maxDepth,
      averageDepth: Number(avgDepth.toFixed(4)),
      chainLengths,
      deepestChains,
      depthDistribution: depthBins,
      hasExcessivelyDeepChains,
      layeringViolations,
    };
  } catch (err) {
    throw new DepthAnalysisError(
      err instanceof Error ? err.message : 'Depth analysis computation failed',
    );
  }
}


