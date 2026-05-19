import { FanLevel } from '@prodmind/contracts';
import type { FanMetricsResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { FanMetricsError } from './metrics-errors.ts';

export function classifyFanLevel(fanIn: number, fanOut: number): FanLevel {
  if (fanIn >= 50 || fanOut >= 50 || (fanIn >= 20 && fanOut >= 20)) {
    return FanLevel.CRITICAL;
  }
  if (fanIn >= 20 || fanOut >= 20 || (fanIn >= 10 && fanOut >= 10)) {
    return FanLevel.HIGH;
  }
  if (fanIn >= 5 || fanOut >= 5) {
    return FanLevel.MODERATE;
  }
  return FanLevel.LOW;
}

export function isUtilityHotspot(fanIn: number, fanOut: number): boolean {
  return fanOut >= 20 && fanIn < fanOut * 0.2;
}

export function isGodModule(fanIn: number, fanOut: number): boolean {
  return fanIn >= 50 && fanOut >= 50;
}

export function computeFanMetrics(cache: GraphAnalysisCache): FanMetricsResult[] {
  try {
    const results: FanMetricsResult[] = [];

    for (const nodeId of cache.sortedNodeIds) {
      const fan = cache.fanMetrics.get(nodeId);
      if (!fan) continue;

      const total = fan.fanIn + fan.fanOut;
      const concentration = total > 0 ? fan.fanIn / total : 0;

      results.push({
        nodeId,
        filePath: cache.nodeIdToPath.get(nodeId) ?? '',
        fanIn: fan.fanIn,
        fanOut: fan.fanOut,
        concentration: Number(concentration.toFixed(4)),
        fanLevel: classifyFanLevel(fan.fanIn, fan.fanOut),
        isUtilityHotspot: isUtilityHotspot(fan.fanIn, fan.fanOut),
        isGodModule: isGodModule(fan.fanIn, fan.fanOut),
      });
    }

    return results;
  } catch (err) {
    throw new FanMetricsError(
      err instanceof Error ? err.message : 'Fan metrics computation failed',
    );
  }
}
