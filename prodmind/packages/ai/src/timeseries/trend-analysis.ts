import type { TrendDataPoint, TrendDirection, ArchitectureTrend, TrendType } from './timeseries-types.ts';
import { fingerprintTrend } from './trend-fingerprint.ts';

export function computeGrowthRate(dataPoints: TrendDataPoint[]): number {
  if (dataPoints.length < 2) return 0;
  const sorted = [...dataPoints].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = sorted[0]!.value;
  const last = sorted[sorted.length - 1]!.value;
  if (first === 0) return last > 0 ? 1 : 0;
  return (last - first) / Math.abs(first);
}

export function computeAverageValue(dataPoints: TrendDataPoint[]): number {
  if (dataPoints.length === 0) return 0;
  return dataPoints.reduce((s, p) => s + p.value, 0) / dataPoints.length;
}

export function determineDirection(growthRate: number): TrendDirection {
  if (growthRate > 0.05) return 'DEGRADING';
  if (growthRate < -0.05) return 'IMPROVING';
  return 'STABLE';
}

export function buildTrend(input: {
  trendType: TrendType;
  dataPoints: TrendDataPoint[];
  normalizedSeverity: number;
  impactedSystems: string[];
  confidence: number;
  evidenceRefs: { source: string; fingerprint: string; description: string }[];
  metadata?: Record<string, unknown>;
}): ArchitectureTrend {
  const growthRate = computeGrowthRate(input.dataPoints);
  const direction = determineDirection(growthRate);
  const severity = normalizedSeverityToLabel(input.normalizedSeverity);
  const fp = fingerprintTrend({
    trendType: input.trendType, direction, normalizedSeverity: input.normalizedSeverity,
    growthRate, snapshotIds: input.dataPoints.map(d => d.snapshotId),
  });
  return {
    trendType: input.trendType, direction, severity, fingerprint: fp,
    dataPoints: [...input.dataPoints].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    normalizedSeverity: input.normalizedSeverity, growthRate: Math.round(growthRate * 1000) / 1000,
    impactedSystems: [...input.impactedSystems].sort(),
    confidence: input.confidence,
    evidenceRefs: [...input.evidenceRefs],
    metadata: { ...input.metadata },
  };
}

function normalizedSeverityToLabel(value: number): string {
  if (value >= 0.7) return 'CRITICAL';
  if (value >= 0.4) return 'HIGH';
  if (value >= 0.2) return 'MODERATE';
  return 'LOW';
}
