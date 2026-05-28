import type { ArchitectureTrend, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

export function detectStabilityTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];
  const snapshotsWithInstability = input.historicalSnapshots.filter(s => s.instability && s.instability.length > 0);
  if (snapshotsWithInstability.length >= 2) {
    const dataPoints = snapshotsWithInstability.map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: s.instability!.filter(i => i.instabilityScore >= 0.7).length / Math.max(s.instability!.length, 1),
    }));
    trends.push(buildTrend({
      trendType: 'STABILITY_DEGRADATION',
      dataPoints,
      normalizedSeverity: dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length,
      impactedSystems: [],
      confidence: Math.min(dataPoints.length / 10, 1),
      evidenceRefs: dataPoints.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `High instability ratio: ${(d.value * 100).toFixed(0)}%` })),
      metadata: { dataPointCount: dataPoints.length },
    }));
  }
  return trends;
}
