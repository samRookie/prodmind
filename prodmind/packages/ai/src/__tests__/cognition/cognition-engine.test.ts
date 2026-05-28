import { describe, it, expect } from 'vitest';
import { CognitionEngine } from '../../cognition/cognition-engine.ts';
import type { CognitionInput } from '../../cognition/cognition-types.ts';

function makeInput(overrides?: Partial<CognitionInput>): CognitionInput {
  return {
    snapshotId: 'test-snap-1',
    insights: [
      { type: 'HOTSPOT', severity: 'HIGH', fingerprint: 'fp-i1', title: 'Hotspot detected', summary: 'High fan', evidence: [{ nodeId: 'n1', description: 'fan' }] },
      { type: 'ARCHITECTURE', severity: 'CRITICAL', fingerprint: 'fp-i2', title: 'Cycles detected', summary: 'Cycles', evidence: [{ nodeId: 'n2', description: 'cycle' }] },
    ],
    patterns: [
      { patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.9, fingerprint: 'fp-p1', impactedNodes: ['n1', 'n2'], metricEvidence: [{ metricType: 'SCC', metricValue: 2 }] },
      { patternType: 'MODULAR', isAntiPattern: false, severity: 'MODERATE', confidence: 0.7, fingerprint: 'fp-p2', impactedNodes: ['n3'], metricEvidence: [{ metricType: 'CLUSTERS', metricValue: 3 }] },
    ],
    risks: [
      { riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, fingerprint: 'fp-r1', impactedNodes: ['n1'] },
      { riskType: 'COUPLING_RISK', severity: 'HIGH', normalizedScore: 0.65, fingerprint: 'fp-r2', impactedNodes: ['n2'] },
    ],
    recommendations: [
      { category: 'STABILITY', severity: 'CRITICAL', priority: 'IMMEDIATE', priorityScore: 0.9, fingerprint: 'fp-rec1', title: 'Fix stability', summary: 'Stability fix', impactedNodes: ['n1'], evidenceRefs: [{ description: 'evidence' }] },
      { category: 'DECOUPLING', severity: 'HIGH', priority: 'HIGH', priorityScore: 0.7, fingerprint: 'fp-rec2', title: 'Decouple modules', summary: 'Decouple', impactedNodes: ['n2'], evidenceRefs: [{ description: 'evidence' }] },
    ],
    centrality: [{ nodeId: 'n1', inDegree: 20, outDegree: 5, dependencyInfluenceScore: 0.7 }],
    fanMetrics: [{ nodeId: 'n1', fanIn: 20, fanOut: 5, concentration: 0.8 }],
    instability: [{ nodeId: 'n1', instabilityScore: 0.75, instabilityLevel: 'HIGH' }],
    propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.8, blastRadiusAmplification: 0.85 }],
    couplingDensity: { globalDensity: 0.1, clusterDensities: [{ clusterName: 'core', density: 0.3, nodeCount: 5 }, { clusterName: 'utils', density: 0.02, nodeCount: 3 }], edgeConcentration: 0.15 },
    complexity: { finalScore: 0.5, complexityLevel: 'HIGH', densityScore: 0.4, entropyScore: 0.3, fragmentationScore: 0.2, cycleScore: 0.4, depthScore: 0.3, sccDensity: 0.3, architecturalEntropy: 0.3, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('CognitionEngine', () => {
  it('generates global cognition snapshot', () => {
    const engine = new CognitionEngine();
    const output = engine.analyze(makeInput(), ['GLOBAL']);
    expect(output.snapshotId).toBe('test-snap-1');
    expect(output.snapshots).toHaveLength(1);
    expect(output.snapshots[0]!.cognitionType).toBe('GLOBAL');
  });

  it('generates all snapshot types by default', () => {
    const engine = new CognitionEngine();
    const output = engine.analyze(makeInput());
    expect(output.snapshots.length).toBeGreaterThanOrEqual(2);
    const types = output.snapshots.map(s => s.cognitionType);
    expect(types).toContain('GLOBAL');
  });

  it('snapshot contains dominant risks and patterns', () => {
    const engine = new CognitionEngine();
    const output = engine.analyze(makeInput(), ['GLOBAL']);
    const snap = output.snapshots[0]!;
    expect(snap.dominantRisks.length).toBeGreaterThan(0);
    expect(snap.dominantPatterns.length).toBeGreaterThan(0);
    expect(snap.topRecommendations.length).toBeGreaterThan(0);
  });

  it('health score is computed', () => {
    const engine = new CognitionEngine();
    const output = engine.analyze(makeInput(), ['GLOBAL']);
    const snap = output.snapshots[0]!;
    expect(snap.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(snap.healthScore.overall).toBeLessThanOrEqual(1);
    expect(['HEALTHY', 'MODERATE', 'AT_RISK', 'CRITICAL']).toContain(snap.healthScore.label);
  });

  it('severity distribution counts all findings', () => {
    const engine = new CognitionEngine();
    const output = engine.analyze(makeInput(), ['GLOBAL']);
    const snap = output.snapshots[0]!;
    const { critical, high, moderate, low } = snap.severityDistribution;
    expect(critical + high + moderate + low).toBeGreaterThan(0);
  });

  it('produces deterministic output for same input', () => {
    const engine = new CognitionEngine();
    const a = engine.analyze(makeInput());
    const b = engine.analyze(makeInput());
    expect(a.snapshots.map(s => s.fingerprint)).toEqual(b.snapshots.map(s => s.fingerprint));
  });

  it('handles minimal input', () => {
    const engine = new CognitionEngine();
    const minimal: CognitionInput = {
      snapshotId: 'min', insights: [], patterns: [], risks: [], recommendations: [],
      centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
      couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
      complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 },
    };
    const output = engine.analyze(minimal, ['GLOBAL']);
    expect(output.snapshots).toHaveLength(1);
    expect(output.snapshots[0]!.healthScore.label).toBe('HEALTHY');
  });
});
