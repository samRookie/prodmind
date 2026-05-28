import { describe, it, expect } from 'vitest';
import { detectRiskTrends } from '../../timeseries/risk-timeseries.ts';
import type { TimeseriesInput } from '../../timeseries/timeseries-types.ts';

describe('RiskTimeseries', () => {
  it('detects maintainability decline trend from critical risks', () => {
    const input: TimeseriesInput = {
      snapshotId: 's3',
      historicalSnapshots: [
        { id: 's1', createdAt: '2024-01-01T00:00:00Z', risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.5 }] },
        { id: 's2', createdAt: '2024-02-01T00:00:00Z', risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.8 }, { riskType: 'COUPLING_RISK', severity: 'CRITICAL', normalizedScore: 0.9 }] },
      ],
    };
    const trends = detectRiskTrends(input);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends.some(t => t.trendType === 'MAINTAINABILITY_DECLINE')).toBe(true);
  });

  it('returns empty for insufficient snapshots', () => {
    const input: TimeseriesInput = { snapshotId: 's1', historicalSnapshots: [{ id: 's1', createdAt: '2024-01-01T00:00:00Z' }] };
    const trends = detectRiskTrends(input);
    expect(trends).toHaveLength(0);
  });
});
