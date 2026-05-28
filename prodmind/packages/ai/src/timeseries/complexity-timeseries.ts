import type { ArchitectureTrend, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

export function detectComplexityTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];
  const snapshotsWithComplexity = input.historicalSnapshots.filter(s => s.complexity !== undefined);
  if (snapshotsWithComplexity.length >= 2) {
    const dataPoints = snapshotsWithComplexity.map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: s.complexity!.finalScore,
    }));
    trends.push(buildTrend({
      trendType: 'COMPLEXITY_GROWTH',
      dataPoints,
      normalizedSeverity: dataPoints.reduce((s, d) => s + d.value, 0) / dataPoints.length,
      impactedSystems: [],
      confidence: Math.min(dataPoints.length / 10, 1),
      evidenceRefs: dataPoints.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Complexity: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: dataPoints.length },
    }));
  }
  return trends;
}
