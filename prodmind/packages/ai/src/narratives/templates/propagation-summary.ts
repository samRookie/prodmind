import type { NarrativeInput } from '../narrative-types.ts';

export function renderPropagationSummary(input: NarrativeInput): string {
  const highPressure = input.propagationRisk.filter(p => p.propagationPressure >= 0.7);
  if (highPressure.length === 0) return 'No high-risk propagation nodes identified.';
  const parts: string[] = [];
  parts.push(`${highPressure.length} node(s) with high propagation pressure`);
  const avgPressure = highPressure.reduce((s, p) => s + p.propagationPressure, 0) / highPressure.length;
  parts.push(`Average propagation pressure: ${avgPressure.toFixed(3)}`);
  return parts.join('. ') + '.';
}

export function collectPropagationMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  const highPressure = input.propagationRisk.filter(p => p.propagationPressure >= 0.7);
  return [
    { metricType: 'HIGH_PROPAGATION_NODES', metricValue: highPressure.length },
    { metricType: 'TOTAL_PROPAGATION_NODES', metricValue: input.propagationRisk.length },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectPropagationImpactedSystems(input: NarrativeInput): string[] {
  return input.propagationRisk.filter(p => p.propagationPressure >= 0.5).map(p => p.nodeId).sort();
}
