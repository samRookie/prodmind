import { describe, it, expect } from 'vitest';
import { computeGrowthRate, computeAverageValue, determineDirection, buildTrend } from '../../timeseries/trend-analysis.ts';
import type { TrendDataPoint } from '../../timeseries/timeseries-types.ts';

describe('TrendAnalysis', () => {
  it('computeGrowthRate returns positive for increasing values', () => {
    const points: TrendDataPoint[] = [
      { snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.3 },
      { snapshotId: 's2', timestamp: '2024-02-01T00:00:00Z', value: 0.7 },
    ];
    const rate = computeGrowthRate(points);
    expect(rate).toBeGreaterThan(0);
  });

  it('computeGrowthRate returns negative for decreasing values', () => {
    const points: TrendDataPoint[] = [
      { snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.7 },
      { snapshotId: 's2', timestamp: '2024-02-01T00:00:00Z', value: 0.3 },
    ];
    const rate = computeGrowthRate(points);
    expect(rate).toBeLessThan(0);
  });

  it('computeGrowthRate returns 0 for less than 2 points', () => {
    expect(computeGrowthRate([{ snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.5 }])).toBe(0);
    expect(computeGrowthRate([])).toBe(0);
  });

  it('computeAverageValue works', () => {
    const points: TrendDataPoint[] = [
      { snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.2 },
      { snapshotId: 's2', timestamp: '2024-02-01T00:00:00Z', value: 0.4 },
      { snapshotId: 's3', timestamp: '2024-03-01T00:00:00Z', value: 0.6 },
    ];
    expect(computeAverageValue(points)).toBeCloseTo(0.4);
  });

  it('determineDirection returns DEGRADING for high positive growth', () => {
    expect(determineDirection(0.1)).toBe('DEGRADING');
    expect(determineDirection(-0.1)).toBe('IMPROVING');
    expect(determineDirection(0.02)).toBe('STABLE');
  });

  it('buildTrend produces deterministic fingerprint', () => {
    const a = buildTrend({ trendType: 'COMPLEXITY_GROWTH', dataPoints: [{ snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.5 }], normalizedSeverity: 0.5, impactedSystems: [], confidence: 0.8, evidenceRefs: [] });
    const b = buildTrend({ trendType: 'COMPLEXITY_GROWTH', dataPoints: [{ snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z', value: 0.5 }], normalizedSeverity: 0.5, impactedSystems: [], confidence: 0.8, evidenceRefs: [] });
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
