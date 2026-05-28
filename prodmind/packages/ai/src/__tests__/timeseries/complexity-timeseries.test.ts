import { describe, it, expect } from 'vitest';
import { detectComplexityTrends } from '../../timeseries/complexity-timeseries.ts';
import type { TimeseriesInput } from '../../timeseries/timeseries-types.ts';

describe('ComplexityTimeseries', () => {
  it('detects complexity growth trend', () => {
    const input: TimeseriesInput = {
      snapshotId: 's3',
      historicalSnapshots: [
        { id: 's1', createdAt: '2024-01-01T00:00:00Z', complexity: { finalScore: 0.3, fragmentationScore: 0.1 } },
        { id: 's2', createdAt: '2024-02-01T00:00:00Z', complexity: { finalScore: 0.5, fragmentationScore: 0.2 } },
        { id: 's3', createdAt: '2024-03-01T00:00:00Z', complexity: { finalScore: 0.7, fragmentationScore: 0.3 } },
      ],
    };
    const trends = detectComplexityTrends(input);
    expect(trends).toHaveLength(1);
    expect(trends[0]!.trendType).toBe('COMPLEXITY_GROWTH');
    expect(trends[0]!.dataPoints).toHaveLength(3);
  });

  it('returns empty for insufficient snapshots', () => {
    const input: TimeseriesInput = { snapshotId: 's1', historicalSnapshots: [{ id: 's1', createdAt: '2024-01-01T00:00:00Z' }] };
    expect(detectComplexityTrends(input)).toHaveLength(0);
  });
});
