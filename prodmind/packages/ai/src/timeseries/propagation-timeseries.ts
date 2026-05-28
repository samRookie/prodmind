import type { ArchitectureTrend, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

export function detectPropagationTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];
  const snapshotsWithPropagation = input.historicalSnapshots.filter(s => s.propagationRisk && s.propagationRisk.length > 0);
  if (snapshotsWithPropagation.length >= 2) {
    const dataPoints = snapshotsWithPropagation.map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: s.propagationRisk!.filter(p => p.propagationPressure >= 0.7).length / Math.max(s.propagationRisk!.length, 1),
    }));
    trends.push(buildTrend({
      trendType: 'PROPAGATION_EXPANSION',
      dataPoints,
      normalizedSeverity: dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length,
      impactedSystems: [],
      confidence: Math.min(dataPoints.length / 10, 1),
      evidenceRefs: dataPoints.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `High propagation ratio: ${(d.value * 100).toFixed(0)}%` })),
      metadata: { dataPointCount: dataPoints.length },
    }));
  }
  return trends;
}
