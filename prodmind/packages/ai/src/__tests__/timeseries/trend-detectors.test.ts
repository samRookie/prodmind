import { describe, it, expect } from 'vitest';
import { detectTrends } from '../../timeseries/trend-detectors.ts';
import type { TimeseriesInput } from '../../timeseries/timeseries-types.ts';

describe('TrendDetectors', () => {
  it('detects multiple trends from historical data', () => {
    const input: TimeseriesInput = {
      snapshotId: 's3',
      historicalSnapshots: [
        { id: 's1', createdAt: '2024-01-01T00:00:00Z', healthScore: 0.8, complexity: { finalScore: 0.3, fragmentationScore: 0.1 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.4 }], hotspots: [], propagationRisk: [], couplingDensity: { globalDensity: 0.05 } },
        { id: 's2', createdAt: '2024-02-01T00:00:00Z', healthScore: 0.6, complexity: { finalScore: 0.5, fragmentationScore: 0.2 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.7 }], hotspots: [{ nodeId: 'n1', severity: 'HIGH' }], propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.6 }], couplingDensity: { globalDensity: 0.08 } },
        { id: 's3', createdAt: '2024-03-01T00:00:00Z', healthScore: 0.4, complexity: { finalScore: 0.7, fragmentationScore: 0.4 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.9 }], hotspots: [{ nodeId: 'n1', severity: 'HIGH' }, { nodeId: 'n2', severity: 'CRITICAL' }], propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.8 }, { nodeId: 'n2', propagationPressure: 0.9 }], couplingDensity: { globalDensity: 0.12 } },
      ],
    };
    const trends = detectTrends(input);
    expect(trends.length).toBeGreaterThanOrEqual(4);
    const trendTypes = trends.map(t => t.trendType);
    expect(trendTypes).toContain('COMPLEXITY_GROWTH');
    expect(trendTypes).toContain('ARCHITECTURE_HEALTH_RECOVERY');
    expect(trendTypes).toContain('RISK_ACCELERATION');
    expect(trendTypes).toContain('ARCHITECTURE_FRAGMENTATION');
  });

  it('empty history returns empty trends', () => {
    const input: TimeseriesInput = { snapshotId: 's1', historicalSnapshots: [] };
    expect(detectTrends(input)).toHaveLength(0);
  });
});
