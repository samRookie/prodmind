import { describe, it, expect } from 'vitest';
import { RiskEngine } from '../../risk/risk-engine.ts';
import type { RiskInput } from '../../risk/risk-types.ts';

function makeInput(overrides?: Partial<RiskInput>): RiskInput {
  return {
    snapshotId: 'test-snap-1',
    insights: [{ type: 'ARCHITECTURE', severity: 'CRITICAL', fingerprint: 'fp-i1', title: 'Critical', summary: 'Critical', evidence: [{ nodeId: 'n1', description: 'test' }], metadata: {} }],
    patterns: [{ patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.9, fingerprint: 'fp-p1', impactedNodes: ['n1', 'n2'], metricEvidence: [{ metricType: 'SCC', metricValue: 2 }], metadata: {} }],
    centrality: [], fanMetrics: [],
    instability: [{ nodeId: 'n1', instabilityScore: 0.8, instabilityLevel: 'HIGH', isUnstableInfrastructure: false, isVolatileCore: true, hasInversionRisk: true }],
    propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.8, blastRadiusAmplification: 0.85, cascadeEstimate: 15, isChokePoint: true }],
    couplingDensity: { globalDensity: 0.12, clusterDensities: [{ clusterName: 'core', density: 0.3, nodeCount: 5 }], edgeConcentration: 0.2 },
    complexity: { finalScore: 0.6, complexityLevel: 'HIGH', densityScore: 0.5, entropyScore: 0.4, fragmentationScore: 0.3, cycleScore: 0.5, depthScore: 0.4, edgeNodeRatio: 0.6, sccDensity: 0.4, architecturalEntropy: 0.5, graphFragmentation: 0.2 },
    ...overrides,
  };
}

describe('RiskEngine', () => {
  it('generates risk correlations from input', () => {
    const engine = new RiskEngine();
    const output = engine.analyze(makeInput());
    expect(output.snapshotId).toBe('test-snap-1');
    expect(output.correlations.length).toBeGreaterThan(0);
  });

  it('correlations are ranked by score descending', () => {
    const engine = new RiskEngine();
    const output = engine.analyze(makeInput());
    for (let i = 1; i < output.correlations.length; i++) {
      expect(output.correlations[i]!.normalizedScore).toBeLessThanOrEqual(output.correlations[i - 1]!.normalizedScore);
    }
  });

  it('produces deterministic output', () => {
    const engine = new RiskEngine();
    const a = engine.analyze(makeInput());
    const b = engine.analyze(makeInput());
    expect(a.correlations.map(c => c.fingerprint)).toEqual(b.correlations.map(c => c.fingerprint));
  });

  it('handles minimal input', () => {
    const engine = new RiskEngine();
    const minimal: RiskInput = { snapshotId: 'min', insights: [], patterns: [], centrality: [], fanMetrics: [], instability: [], propagationRisk: [], couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 }, complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, edgeNodeRatio: 0, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 } };
    const output = engine.analyze(minimal);
    expect(output.correlations).toHaveLength(0);
  });
});
