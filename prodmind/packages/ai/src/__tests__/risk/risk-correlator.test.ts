import { describe, it, expect } from 'vitest';
import { correlateRisks } from '../../risk/risk-correlator.ts';
import type { RiskInput } from '../../risk/risk-types.ts';

function makeInput(overrides?: Partial<RiskInput>): RiskInput {
  return {
    snapshotId: 'test-snap-1',
    insights: [{ type: 'ARCHITECTURE', severity: 'CRITICAL', fingerprint: 'fp-i1', title: 'Cyclic deps', summary: 'Cycles', evidence: [{ nodeId: 'n1', description: 'cycle' }], metadata: {} }],
    patterns: [
      { patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.9, fingerprint: 'fp-p1', impactedNodes: ['n1', 'n2', 'n3'], metricEvidence: [{ metricType: 'SCC_SIZE', metricValue: 3 }], metadata: {} },
      { patternType: 'GOD_MODULE', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.85, fingerprint: 'fp-p2', impactedNodes: ['n1'], metricEvidence: [{ metricType: 'FAN_IN', metricValue: 50 }], metadata: {} },
    ],
    centrality: [], fanMetrics: [],
    instability: [{ nodeId: 'n1', instabilityScore: 0.85, instabilityLevel: 'HIGH', isUnstableInfrastructure: false, isVolatileCore: true, hasInversionRisk: true }],
    propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.9, blastRadiusAmplification: 0.95, cascadeEstimate: 20, isChokePoint: true }],
    couplingDensity: { globalDensity: 0.15, clusterDensities: [{ clusterName: 'core', density: 0.4, nodeCount: 5 }], edgeConcentration: 0.3 },
    complexity: { finalScore: 0.7, complexityLevel: 'HIGH', densityScore: 0.6, entropyScore: 0.5, fragmentationScore: 0.4, cycleScore: 0.6, depthScore: 0.5, edgeNodeRatio: 0.8, sccDensity: 0.5, architecturalEntropy: 0.6, graphFragmentation: 0.3 },
    ...overrides,
  };
}

describe('correlateRisks', () => {
  it('correlates architectural collapse risk', () => {
    const results = correlateRisks(makeInput());
    const collapse = results.find(r => r.riskType === 'ARCHITECTURAL_COLLAPSE_RISK');
    expect(collapse).toBeDefined();
    expect(collapse!.severity).toBe('CRITICAL');
  });

  it('correlates cascade failure risk', () => {
    const results = correlateRisks(makeInput());
    const cascade = results.find(r => r.riskType === 'CASCADE_FAILURE_RISK');
    expect(cascade).toBeDefined();
  });

  it('correlates coupling risk', () => {
    const results = correlateRisks(makeInput({ couplingDensity: { globalDensity: 0.25, clusterDensities: [{ clusterName: 'core', density: 0.5, nodeCount: 5 }], edgeConcentration: 0.4 } }));
    const coupling = results.find(r => r.riskType === 'COUPLING_RISK');
    expect(coupling).toBeDefined();
  });

  it('correlates stability risk', () => {
    const results = correlateRisks(makeInput());
    const stability = results.find(r => r.riskType === 'STABILITY_RISK');
    expect(stability).toBeDefined();
  });

  it('correlates complexity risk', () => {
    const results = correlateRisks(makeInput());
    const complexity = results.find(r => r.riskType === 'COMPLEXITY_RISK');
    expect(complexity).toBeDefined();
  });

  it('produces deterministic fingerprints', () => {
    const a = correlateRisks(makeInput());
    const b = correlateRisks(makeInput());
    expect(a.map(r => r.fingerprint)).toEqual(b.map(r => r.fingerprint));
  });

  it('filters out low-risk scenarios', () => {
    const low: RiskInput = { snapshotId: 'low', insights: [], patterns: [], centrality: [], fanMetrics: [], instability: [], propagationRisk: [], couplingDensity: { globalDensity: 0.01, clusterDensities: [], edgeConcentration: 0 }, complexity: { finalScore: 0.1, complexityLevel: 'LOW', densityScore: 0.1, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.1, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 } };
    const results = correlateRisks(low);
    expect(results.length).toBeLessThan(5);
  });

  it('normalized scores are between 0 and 1', () => {
    const results = correlateRisks(makeInput());
    for (const r of results) {
      expect(r.normalizedScore).toBeGreaterThanOrEqual(0);
      expect(r.normalizedScore).toBeLessThanOrEqual(1);
    }
  });
});
