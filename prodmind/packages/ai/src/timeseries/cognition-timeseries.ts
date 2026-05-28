import type { ArchitectureTrend, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

export function detectCognitionTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];
  const snapshotsWithPatterns = input.historicalSnapshots.filter(s => s.patterns && s.patterns.length > 0);
  if (snapshotsWithPatterns.length >= 2) {
    const dataPoints = snapshotsWithPatterns.map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: s.patterns!.filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH').length / Math.max(s.patterns!.length, 1),
    }));
    trends.push(buildTrend({
      trendType: 'SCC_DENSIFICATION',
      dataPoints,
      normalizedSeverity: dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length,
      impactedSystems: [],
      confidence: Math.min(dataPoints.length / 10, 1),
      evidenceRefs: dataPoints.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Pattern severity ratio: ${(d.value * 100).toFixed(0)}%` })),
      metadata: { dataPointCount: dataPoints.length },
    }));
  }
  return trends;
}
