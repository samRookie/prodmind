import type { NarrativeInput } from '../narrative-types.ts';

export function renderArchitectureSummary(input: NarrativeInput): string {
  const parts: string[] = [];
  const clusterCount = input.couplingDensity.clusterDensities.length;
  parts.push(`Architecture overview: ${clusterCount} clusters identified`);
  const criticalPatterns = input.patterns.filter(p => p.isAntiPattern && p.severity === 'CRITICAL');
  if (criticalPatterns.length > 0) parts.push(`${criticalPatterns.length} critical anti-patterns present`);
  const criticalRisks = input.risks.filter(r => r.severity === 'CRITICAL');
  if (criticalRisks.length > 0) parts.push(`${criticalRisks.length} critical risks identified`);
  return parts.join('. ') + '.';
}

export function collectArchitectureMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  return [
    { metricType: 'CLUSTER_COUNT', metricValue: input.couplingDensity.clusterDensities.length },
    { metricType: 'GLOBAL_DENSITY', metricValue: input.couplingDensity.globalDensity },
    { metricType: 'COMPLEXITY_SCORE', metricValue: input.complexity.finalScore },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectArchitectureImpactedSystems(input: NarrativeInput): string[] {
  const systems = new Set<string>();
  for (const p of input.patterns) for (const n of p.impactedNodes) systems.add(n);
  return [...systems].sort();
}
