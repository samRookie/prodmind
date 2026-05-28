import type { NarrativeInput } from '../narrative-types.ts';

export function renderStabilitySummary(input: NarrativeInput): string {
  const highInstability = input.instability.filter(i => i.instabilityScore >= 0.7);
  if (highInstability.length === 0) return 'No critical instability identified.';
  const parts: string[] = [];
  parts.push(`${highInstability.length} module(s) with high instability`);
  const avgInstability = highInstability.reduce((s, i) => s + i.instabilityScore, 0) / highInstability.length;
  parts.push(`Average instability: ${avgInstability.toFixed(3)}`);
  const criticalCount = input.cognitionSnapshots.flatMap(c => c.criticalHotspots).filter(h => h.severity === 'CRITICAL').length;
  if (criticalCount > 0) parts.push(`${criticalCount} critical hotspot(s) indicating stability risk`);
  return parts.join('. ') + '.';
}

export function collectStabilityMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  const highInstability = input.instability.filter(i => i.instabilityScore >= 0.7);
  return [
    { metricType: 'HIGH_INSTABILITY_COUNT', metricValue: highInstability.length },
    { metricType: 'TOTAL_INSTABILITY_NODES', metricValue: input.instability.length },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectStabilityImpactedSystems(input: NarrativeInput): string[] {
  return input.instability.filter(i => i.instabilityScore >= 0.5).map(i => i.nodeId).sort();
}
