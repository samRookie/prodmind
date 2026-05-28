import type { NarrativeInput } from '../narrative-types.ts';

export function renderRiskSummary(input: NarrativeInput): string {
  if (input.risks.length === 0) return 'No risks identified.';
  const criticalCount = input.risks.filter(r => r.severity === 'CRITICAL').length;
  const highCount = input.risks.filter(r => r.severity === 'HIGH').length;
  const parts: string[] = [];
  parts.push(`${input.risks.length} risk(s) identified`);
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (highCount > 0) parts.push(`${highCount} high severity`);
  const topRisk = input.risks.sort((a, b) => b.normalizedScore - a.normalizedScore)[0];
  if (topRisk) parts.push(`Highest: ${topRisk.riskType} (${(topRisk.normalizedScore * 100).toFixed(0)}/100)`);
  return parts.join('. ') + '.';
}

export function collectRiskMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  return [
    { metricType: 'TOTAL_RISKS', metricValue: input.risks.length },
    { metricType: 'CRITICAL_RISKS', metricValue: input.risks.filter(r => r.severity === 'CRITICAL').length },
    { metricType: 'HIGH_RISKS', metricValue: input.risks.filter(r => r.severity === 'HIGH').length },
  ].sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectRiskImpactedSystems(input: NarrativeInput): string[] {
  return [...new Set(input.risks.flatMap(r => r.impactedNodes))].sort();
}
