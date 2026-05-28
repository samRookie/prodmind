import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '../../recommendations/recommendation-engine.ts';
import type { RecommendationInput } from '../../recommendations/recommendation-types.ts';

function makeInput(overrides?: Partial<RecommendationInput>): RecommendationInput {
  return {
    snapshotId: 'test-snap-1',
    insights: [
      { type: 'HOTSPOT', severity: 'HIGH', scope: 'NODE', fingerprint: 'fp-insight-1', title: 'Hotspot', summary: 'Test hotspot', evidence: [{ nodeId: 'node-1', description: 'High fan' }], metadata: {} },
      { type: 'INSTABILITY', severity: 'CRITICAL', scope: 'NODE', fingerprint: 'fp-insight-2', title: 'Unstable', summary: 'Test instability', evidence: [{ nodeId: 'node-2', description: 'Unstable' }], metadata: {} },
    ],
    patterns: [
      { patternType: 'GOD_MODULE', severity: 'HIGH', confidence: 0.8, fingerprint: 'fp-pattern-1', title: 'God module', summary: 'Test god module', impactedNodes: ['node-1'], evidence: [{ description: 'God module' }] },
    ],
    risks: [
      { riskType: 'STABILITY_RISK', normalizedScore: 0.85, severity: 'CRITICAL', fingerprint: 'fp-risk-1', impactedNodes: ['node-2'] },
    ],
    propagationRisk: [
      { nodeId: 'node-3', propagationPressure: 0.75, blastRadiusAmplification: 0.8, cascadeEstimate: 12, isChokePoint: true },
    ],
    fanMetrics: [
      { nodeId: 'node-4', fanIn: 40, fanOut: 30, concentration: 0.9, isUtilityHotspot: true, isGodModule: true },
    ],
    centrality: [], instability: [], couplingDensity: { globalDensity: 0.05, clusterDensities: [], edgeConcentration: 0 }, complexity: { finalScore: 0.4, complexityLevel: 'MODERATE' },
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  it('generates recommendations from input', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    expect(output.snapshotId).toBe('test-snap-1');
    expect(output.recommendations.length).toBeGreaterThan(0);
  });

  it('includes recommendations from insights', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    const hotspotRecs = output.recommendations.filter(r => r.title.includes('Hotspot') || r.title.includes('Unstable'));
    expect(hotspotRecs.length).toBeGreaterThan(0);
  });

  it('includes recommendations from patterns', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    const patternRecs = output.recommendations.filter(r => r.title.includes('God'));
    expect(patternRecs.length).toBeGreaterThan(0);
  });

  it('includes recommendations from risks', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    const riskRecs = output.recommendations.filter(r => r.title.includes('STABILITY_RISK'));
    expect(riskRecs.length).toBeGreaterThan(0);
  });

  it('recommendations are ranked by priority', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    for (let i = 1; i < output.recommendations.length; i++) {
      expect(output.recommendations[i]!.priorityScore).toBeLessThanOrEqual(output.recommendations[i - 1]!.priorityScore);
    }
  });

  it('fingerprints are unique per recommendation', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    const fingerprints = output.recommendations.map(r => r.fingerprint);
    expect(new Set(fingerprints).size).toBe(fingerprints.length);
  });

  it('produces deterministic output for same input', () => {
    const engine = new RecommendationEngine();
    const a = engine.generate(makeInput());
    const b = engine.generate(makeInput());
    expect(a.recommendations.map(r => r.fingerprint)).toEqual(b.recommendations.map(r => r.fingerprint));
  });

  it('generates god module recommendation', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput({
      fanMetrics: [{ nodeId: 'god-node', fanIn: 60, fanOut: 50, concentration: 0.95, isUtilityHotspot: false, isGodModule: true }],
    }));
    const godRecs = output.recommendations.filter(r => r.title.includes('God module'));
    expect(godRecs.length).toBeGreaterThan(0);
    expect(godRecs[0]!.remediation.templateId).toBe('SPLIT_GOD_MODULE');
  });

  it('handles empty input', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate({ snapshotId: 'empty', insights: [], patterns: [], risks: [], propagationRisk: [], fanMetrics: [], centrality: [], instability: [], couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 }, complexity: { finalScore: 0, complexityLevel: 'LOW' } });
    expect(output.recommendations).toHaveLength(0);
  });

  it('fingerprint output returns deterministic batch hash', () => {
    const engine = new RecommendationEngine();
    const output = engine.generate(makeInput());
    const fp1 = engine.fingerprint(output);
    const fp2 = engine.fingerprint(output);
    expect(fp1).toBe(fp2);
  });
});
