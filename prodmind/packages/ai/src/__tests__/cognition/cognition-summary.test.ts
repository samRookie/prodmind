import { describe, it, expect } from 'vitest';
import { generateArchitectureSummary, buildSeverityDistribution, computeConfidenceSummary, identifyCriticalHotspots } from '../../cognition/cognition-summary.ts';
import type { CognitionInput } from '../../cognition/cognition-types.ts';

function makeInput(): CognitionInput {
  return {
    snapshotId: 'test', insights: [], patterns: [], risks: [], recommendations: [],
    centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
    couplingDensity: { globalDensity: 0.1, clusterDensities: [{ clusterName: 'a', density: 0.3, nodeCount: 5 }], edgeConcentration: 0.1 },
    complexity: { finalScore: 0.4, complexityLevel: 'MODERATE', densityScore: 0.3, entropyScore: 0.2, fragmentationScore: 0.1, cycleScore: 0.1, depthScore: 0.2, sccDensity: 0.1, architecturalEntropy: 0.2, graphFragmentation: 0.1 },
  };
}

describe('generateArchitectureSummary', () => {
  it('returns summary string', () => {
    const summary = generateArchitectureSummary(makeInput());
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
  });
});

describe('buildSeverityDistribution', () => {
  it('counts all severities across inputs', () => {
    const input = makeInput();
    input.insights = [{ type: 'HOTSPOT', severity: 'CRITICAL', fingerprint: 'a', title: 'a', summary: 'a', evidence: [] }];
    input.patterns = [{ patternType: 'GOD', isAntiPattern: true, severity: 'HIGH', confidence: 0.8, fingerprint: 'b', impactedNodes: [], metricEvidence: [] }];
    input.risks = [{ riskType: 'STABILITY', severity: 'MODERATE', normalizedScore: 0.5, fingerprint: 'c', impactedNodes: [] }];
    input.recommendations = [{ category: 'REFACTOR', severity: 'LOW', priority: 'LOW', priorityScore: 0.2, fingerprint: 'd', title: 'd', summary: 'd', impactedNodes: [], evidenceRefs: [] }];
    const dist = buildSeverityDistribution(input);
    expect(dist.critical).toBe(1);
    expect(dist.high).toBe(1);
    expect(dist.moderate).toBe(1);
    expect(dist.low).toBe(1);
  });
});

describe('computeConfidenceSummary', () => {
  it('computes confidence values', () => {
    const summary = computeConfidenceSummary(makeInput());
    expect(summary.overall).toBeGreaterThanOrEqual(0);
    expect(summary.overall).toBeLessThanOrEqual(1);
  });
});

describe('identifyCriticalHotspots', () => {
  it('identifies nodes from high-severity insights', () => {
    const input = makeInput();
    input.insights = [{ type: 'HOTSPOT', severity: 'CRITICAL', fingerprint: 'a', title: 'Critical hotspot', summary: '', evidence: [{ nodeId: 'n1', description: 'hot' }] }];
    const hotspots = identifyCriticalHotspots(input);
    expect(hotspots.length).toBeGreaterThan(0);
    expect(hotspots[0]!.nodeId).toBe('n1');
  });
});
