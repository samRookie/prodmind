import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../../cognition/cognition-health-score.ts';
import type { CognitionInput } from '../../cognition/cognition-types.ts';

function makeInput(overrides?: Partial<CognitionInput>): CognitionInput {
  return {
    snapshotId: 'test', insights: [], patterns: [], risks: [], recommendations: [],
    centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 },
    ...overrides,
  };
}

describe('computeHealthScore', () => {
  it('returns HEALTHY for clean architecture', () => {
    const score = computeHealthScore(makeInput());
    expect(score.label).toBe('HEALTHY');
    expect(score.overall).toBeGreaterThanOrEqual(0.8);
  });

  it('returns CRITICAL for severely degraded architecture', () => {
    const score = computeHealthScore(makeInput({
      complexity: { finalScore: 0.9, complexityLevel: 'CRITICAL', densityScore: 0.9, entropyScore: 0.9, fragmentationScore: 0.8, cycleScore: 0.9, depthScore: 0.8, sccDensity: 0.8, architecturalEntropy: 0.9, graphFragmentation: 0.7 },
      instability: [{ nodeId: 'n1', instabilityScore: 0.9, instabilityLevel: 'CRITICAL' }],
      propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.9, blastRadiusAmplification: 0.9 }],
      patterns: [{ patternType: 'GOD', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.9, fingerprint: 'a', impactedNodes: ['n1'], metricEvidence: [] }],
      recommendations: [{ category: 'REFACTOR', severity: 'CRITICAL', priority: 'IMMEDIATE', priorityScore: 0.9, fingerprint: 'b', title: 'x', summary: 'x', impactedNodes: [], evidenceRefs: [] }],
    }));
    expect(score.label).toBe('CRITICAL');
    expect(score.overall).toBeLessThan(0.4);
  });

  it('produces deterministic results', () => {
    const input = makeInput({ instability: [{ nodeId: 'n1', instabilityScore: 0.5, instabilityLevel: 'MODERATE' }] });
    const a = computeHealthScore(input);
    const b = computeHealthScore(input);
    expect(a.overall).toBe(b.overall);
    expect(a.label).toBe(b.label);
  });

  it('all sub-scores are between 0 and 1', () => {
    const score = computeHealthScore(makeInput({
      complexity: { finalScore: 0.6, complexityLevel: 'HIGH', densityScore: 0.5, entropyScore: 0.4, fragmentationScore: 0.3, cycleScore: 0.5, depthScore: 0.4, sccDensity: 0.3, architecturalEntropy: 0.4, graphFragmentation: 0.2 },
      instability: [{ nodeId: 'n1', instabilityScore: 0.6, instabilityLevel: 'HIGH' }],
      propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.5, blastRadiusAmplification: 0.5 }],
    }));
    expect(score.complexity).toBeGreaterThanOrEqual(0);
    expect(score.complexity).toBeLessThanOrEqual(1);
    expect(score.instability).toBeGreaterThanOrEqual(0);
    expect(score.instability).toBeLessThanOrEqual(1);
  });
});
