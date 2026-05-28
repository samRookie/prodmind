import { describe, it, expect } from 'vitest';
import { NarrativeEngine } from '../../narratives/narrative-engine.ts';
import type { NarrativeInput } from '../../narratives/narrative-types.ts';

function makeInput(overrides?: Partial<NarrativeInput>): NarrativeInput {
  return {
    snapshotId: 'test-snap-1',
    cognitionSnapshots: [
      { cognitionType: 'GLOBAL', fingerprint: 'fp-c1', architectureSummary: 'System has 3 clusters', dominantRisks: [{ riskType: 'STABILITY_RISK', normalizedScore: 0.85, severity: 'CRITICAL' }], dominantPatterns: [{ patternType: 'CYCLIC_CLUSTER', confidence: 0.9, severity: 'CRITICAL' }], topRecommendations: [{ category: 'STABILITY', priority: 'IMMEDIATE', title: 'Fix' }], criticalHotspots: [{ nodeId: 'n1', severity: 'CRITICAL', reason: 'high fan' }], healthScore: { overall: 0.4, label: 'AT_RISK' }, severityDistribution: { critical: 2, high: 1, moderate: 0, low: 0 }, confidenceSummary: { overall: 0.7 } },
    ],
    patterns: [{ patternType: 'CYCLIC_CLUSTER', isAntiPattern: true, severity: 'CRITICAL', confidence: 0.9, fingerprint: 'fp-p1', impactedNodes: ['n1'], title: 'Cyclic cluster', summary: 'Cycle', metricEvidence: [{ metricType: 'SCC', metricValue: 3 }] }],
    risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, fingerprint: 'fp-r1', title: 'Stability risk', summary: 'Risk', impactedNodes: ['n1'] }],
    recommendations: [{ category: 'STABILITY', severity: 'CRITICAL', priority: 'IMMEDIATE', priorityScore: 0.9, fingerprint: 'fp-rec1', title: 'Fix stability', summary: 'Fix', impactedNodes: ['n1'] }],
    insights: [{ type: 'HOTSPOT', severity: 'HIGH', fingerprint: 'fp-i1', title: 'Hotspot', summary: 'Hot', evidence: [{ nodeId: 'n1', description: 'high fan' }] }],
    couplingDensity: { globalDensity: 0.1, clusterDensities: [{ clusterName: 'core', density: 0.3, nodeCount: 5 }] },
    complexity: { finalScore: 0.6, complexityLevel: 'HIGH', fragmentationScore: 0.2 },
    propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.8, blastRadiusAmplification: 0.9 }],
    instability: [{ nodeId: 'n1', instabilityScore: 0.75, instabilityLevel: 'HIGH' }],
    ...overrides,
  };
}

describe('NarrativeEngine', () => {
  it('generates narratives for all default types', () => {
    const engine = new NarrativeEngine();
    const output = engine.analyze(makeInput());
    expect(output.snapshotId).toBe('test-snap-1');
    expect(output.narratives.length).toBeGreaterThan(0);
  });

  it('generates GLOBAL_ARCHITECTURE_SUMMARY narrative', () => {
    const engine = new NarrativeEngine();
    const output = engine.analyze(makeInput(), ['GLOBAL_ARCHITECTURE_SUMMARY']);
    expect(output.narratives).toHaveLength(1);
    expect(output.narratives[0]!.narrativeType).toBe('GLOBAL_ARCHITECTURE_SUMMARY');
  });

  it('generates EXECUTIVE_SUMMARY narrative', () => {
    const engine = new NarrativeEngine();
    const output = engine.analyze(makeInput(), ['EXECUTIVE_SUMMARY']);
    expect(output.narratives).toHaveLength(1);
    expect(output.narratives[0]!.narrativeType).toBe('EXECUTIVE_SUMMARY');
    expect(output.narratives[0]!.summary.length).toBeGreaterThan(0);
  });

  it('narrative has stable fingerprint', () => {
    const engine = new NarrativeEngine();
    const a = engine.analyze(makeInput());
    const b = engine.analyze(makeInput());
    expect(a.narratives.map(n => n.fingerprint)).toEqual(b.narratives.map(n => n.fingerprint));
  });

  it('handles minimal input', () => {
    const engine = new NarrativeEngine();
    const minimal: NarrativeInput = {
      snapshotId: 'min', cognitionSnapshots: [], patterns: [], risks: [],
      recommendations: [], insights: [], couplingDensity: { globalDensity: 0, clusterDensities: [] },
      complexity: { finalScore: 0, complexityLevel: 'LOW', fragmentationScore: 0 },
      propagationRisk: [], instability: [],
    };
    const output = engine.analyze(minimal, ['EXECUTIVE_SUMMARY']);
    expect(output.narratives).toHaveLength(1);
    expect(output.narratives[0]!.severity).toBe('LOW');
  });
});
