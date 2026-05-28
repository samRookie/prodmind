import type { NarrativeInput } from '../narrative-types.ts';

export function renderCognitionSummary(input: NarrativeInput): string {
  const globalSnap = input.cognitionSnapshots.find(c => c.cognitionType === 'GLOBAL');
  if (!globalSnap) return 'No global cognition snapshot available.';
  const parts: string[] = [];
  parts.push(`Health score: ${(globalSnap.healthScore.overall * 100).toFixed(0)}/100 (${globalSnap.healthScore.label})`);
  parts.push(`Confidence: ${(globalSnap.confidenceSummary.overall * 100).toFixed(0)}/100`);
  const { critical, high, moderate, low } = globalSnap.severityDistribution;
  parts.push(`Findings: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low`);
  return parts.join('. ') + '.';
}

export function collectCognitionMetrics(input: NarrativeInput): { metricType: string; metricValue: number }[] {
  const globalSnap = input.cognitionSnapshots.find(c => c.cognitionType === 'GLOBAL');
  const metrics: { metricType: string; metricValue: number }[] = [
    { metricType: 'COGNITION_SNAPSHOTS', metricValue: input.cognitionSnapshots.length },
    { metricType: 'HEALTH_SCORE', metricValue: globalSnap?.healthScore.overall ?? 0 },
  ];
  return metrics.sort((a, b) => a.metricType.localeCompare(b.metricType));
}

export function collectCognitionImpactedSystems(input: NarrativeInput): string[] {
  const systems = new Set<string>();
  for (const c of input.cognitionSnapshots) for (const h of c.criticalHotspots) systems.add(h.nodeId);
  return [...systems].sort();
}
