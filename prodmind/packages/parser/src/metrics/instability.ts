import { InstabilityLevel } from '@prodmind/contracts';
import type { InstabilityResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { InstabilityError } from './metrics-errors.ts';

export function classifyInstability(I: number): InstabilityLevel {
  if (I > 0.8) return InstabilityLevel.VOLATILE;
  if (I > 0.6) return InstabilityLevel.UNSTABLE;
  if (I >= 0.3) return InstabilityLevel.BALANCED;
  return InstabilityLevel.STABLE;
}

export function computeInstability(cache: GraphAnalysisCache): InstabilityResult[] {
  try {
    const results: InstabilityResult[] = [];

    for (const nodeId of cache.sortedNodeIds) {
      const fan = cache.fanMetrics.get(nodeId);
      if (!fan) continue;

      const filePath = cache.nodeIdToPath.get(nodeId) ?? '';
      const total = fan.fanIn + fan.fanOut;
      const I = total > 0 ? fan.fanOut / total : 0;

      const instabilityLevel = classifyInstability(I);

      const isUnstableInfrastructure = instabilityLevel === InstabilityLevel.UNSTABLE ||
        instabilityLevel === InstabilityLevel.VOLATILE;

      const isVolatileCore = fan.fanIn >= 20 &&
        (instabilityLevel === InstabilityLevel.UNSTABLE || instabilityLevel === InstabilityLevel.VOLATILE);

      const hasInversionRisk = fan.fanOut > fan.fanIn * 3 && fan.fanIn >= 5;

      results.push({
        nodeId,
        filePath,
        instabilityScore: Number(I.toFixed(4)),
        instabilityLevel,
        isUnstableInfrastructure,
        isVolatileCore,
        hasInversionRisk,
      });
    }

    return results;
  } catch (err) {
    throw new InstabilityError(
      err instanceof Error ? err.message : 'Instability computation failed',
    );
  }
}
