import type { NarrativeInput } from '../narrative-types.ts';

export function renderHotspotSummary(input: NarrativeInput): string {
  const hotspots = input.cognitionSnapshots.flatMap(c => c.criticalHotspots);
  if (hotspots.length === 0) return 'No critical hotspots identified.';
  const uniqueNodes = [...new Set(hotspots.map(h => h.nodeId))];
  const criticalCount = hotspots.filter(h => h.severity === 'CRITICAL').length;
  const parts: string[] = [];
  parts.push(`${uniqueNodes.length} hotspot nodes identified`);
  if (criticalCount > 0) parts.push(`${criticalCount} critical hotspot(s) require immediate attention`);
  return parts.join('. ') + '.';
}

export function collectHotspotMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  const hotspots = input.cognitionSnapshots.flatMap(c => c.criticalHotspots);
  return [
    { metricType: 'HOTSPOT_COUNT', metricValue: hotspots.length },
    { metricType: 'CRITICAL_HOTSPOTS', metricValue: hotspots.filter(h => h.severity === 'CRITICAL').length },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectHotspotImpactedSystems(input: NarrativeInput): string[] {
  const hotspots = input.cognitionSnapshots.flatMap(c => c.criticalHotspots);
  return [...new Set(hotspots.map(h => h.nodeId))].sort();
}
