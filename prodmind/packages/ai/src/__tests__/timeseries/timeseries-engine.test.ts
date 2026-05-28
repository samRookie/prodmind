import { describe, it, expect } from 'vitest';
import { TimeseriesEngine } from '../../timeseries/timeseries-engine.ts';
import type { TimeseriesInput } from '../../timeseries/timeseries-types.ts';

function makeInput(overrides?: Partial<TimeseriesInput>): TimeseriesInput {
  return {
    snapshotId: 'current-snap',
    historicalSnapshots: [
      { id: 's1', createdAt: '2024-01-01T00:00:00Z', healthScore: 0.8, complexity: { finalScore: 0.3, fragmentationScore: 0.1 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.4 }], hotspots: [{ nodeId: 'n1', severity: 'HIGH' }], propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.3 }], instability: [{ nodeId: 'n1', instabilityScore: 0.3 }], couplingDensity: { globalDensity: 0.05 } },
      { id: 's2', createdAt: '2024-02-01T00:00:00Z', healthScore: 0.6, complexity: { finalScore: 0.5, fragmentationScore: 0.2 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.7 }], hotspots: [{ nodeId: 'n1', severity: 'HIGH' }, { nodeId: 'n2', severity: 'CRITICAL' }], propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.6 }, { nodeId: 'n2', propagationPressure: 0.8 }], instability: [{ nodeId: 'n1', instabilityScore: 0.5 }, { nodeId: 'n2', instabilityScore: 0.8 }], couplingDensity: { globalDensity: 0.08 } },
      { id: 's3', createdAt: '2024-03-01T00:00:00Z', healthScore: 0.4, complexity: { finalScore: 0.7, fragmentationScore: 0.4 }, risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.9 }], hotspots: [{ nodeId: 'n1', severity: 'HIGH' }, { nodeId: 'n2', severity: 'CRITICAL' }, { nodeId: 'n3', severity: 'HIGH' }], propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.7 }, { nodeId: 'n2', propagationPressure: 0.9 }, { nodeId: 'n3', propagationPressure: 0.8 }], instability: [{ nodeId: 'n1', instabilityScore: 0.6 }, { nodeId: 'n2', instabilityScore: 0.9 }, { nodeId: 'n3', instabilityScore: 0.7 }], couplingDensity: { globalDensity: 0.12 } },
    ],
    ...overrides,
  };
}

describe('TimeseriesEngine', () => {
  it('analyzes historical snapshots and generates trends', () => {
    const engine = new TimeseriesEngine();
    const output = engine.analyze(makeInput());
    expect(output.trends.length).toBeGreaterThan(0);
    expect(output.snapshotId).toBe('current-snap');
  });

  it('detects COMPLEXITY_GROWTH trend', () => {
    const engine = new TimeseriesEngine();
    const output = engine.analyze(makeInput());
    expect(output.trends.some(t => t.trendType === 'COMPLEXITY_GROWTH')).toBe(true);
  });

  it('detects HEALTH_DEGRADING trend (via recovery trend with negative direction)', () => {
    const engine = new TimeseriesEngine();
    const output = engine.analyze(makeInput());
    const healthTrend = output.trends.find(t => t.trendType === 'ARCHITECTURE_HEALTH_RECOVERY');
    expect(healthTrend).toBeDefined();
    expect(healthTrend!.direction).toBe('DEGRADING');
  });

  it('produces deterministic trends for same input', () => {
    const engine = new TimeseriesEngine();
    const a = engine.analyze(makeInput());
    const b = engine.analyze(makeInput());
    expect(a.trends.map(t => t.fingerprint)).toEqual(b.trends.map(t => t.fingerprint));
  });

  it('handles minimal input with 0-1 snapshots', () => {
    const engine = new TimeseriesEngine();
    const minimal: TimeseriesInput = { snapshotId: 's1', historicalSnapshots: [] };
    const output = engine.analyze(minimal);
    expect(output.trends).toHaveLength(0);
  });
});
