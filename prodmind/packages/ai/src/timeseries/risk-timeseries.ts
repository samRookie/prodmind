import type { ArchitectureTrend, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

export function detectRiskTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];
  const criticalRiskSnapshots = input.historicalSnapshots.filter(s => s.risks && s.risks.some(r => r.severity === 'CRITICAL'));
  if (criticalRiskSnapshots.length >= 2) {
    const dataPoints = criticalRiskSnapshots.map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: s.risks!.filter(r => r.severity === 'CRITICAL').length / Math.max(s.risks!.length, 1),
    }));
    trends.push(buildTrend({
      trendType: 'MAINTAINABILITY_DECLINE',
      dataPoints,
      normalizedSeverity: dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length,
      impactedSystems: [],
      confidence: Math.min(dataPoints.length / 10, 1),
      evidenceRefs: dataPoints.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Critical risk ratio: ${(d.value * 100).toFixed(0)}%` })),
      metadata: { dataPointCount: dataPoints.length },
    }));
  }
  return trends;
}
