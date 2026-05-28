import { describe, it, expect } from 'vitest';
import { computeBoundedPropagation, computeAggregatePropagation } from '../../risk/risk-propagation.ts';
import type { RiskCorrelation } from '../../risk/risk-types.ts';

describe('computeBoundedPropagation', () => {
  it('traverses from source nodes bounded by max depth', () => {
    const adj = new Map<string, string[]>([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']], ['d', ['e']], ['e', ['f']]]);
    const result = computeBoundedPropagation(adj, ['a'], 2);
    expect(result.nodeCount).toBeGreaterThan(1);
    expect(result.maxDepth).toBeLessThanOrEqual(2);
    expect(result.reachableNodes).toContain('a');
  });

  it('returns just source node for depth 0', () => {
    const adj = new Map<string, string[]>([['a', ['b']]]);
    const result = computeBoundedPropagation(adj, ['a'], 0);
    expect(result.nodeCount).toBe(1);
  });

  it('handles empty adjacency map', () => {
    const result = computeBoundedPropagation(new Map(), ['a'], 5);
    expect(result.nodeCount).toBe(1);
  });

  it('handles cycles without infinite loop', () => {
    const adj = new Map<string, string[]>([['a', ['b']], ['b', ['c']], ['c', ['a']]]);
    const result = computeBoundedPropagation(adj, ['a'], 10);
    expect(result.nodeCount).toBe(3);
    expect(result.maxDepth).toBe(2);
  });
});

describe('computeAggregatePropagation', () => {
  it('computes propagation for each correlation with impacted nodes', () => {
    const correlations: RiskCorrelation[] = [
      { riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.7, fingerprint: 'fp1', title: 'Test', summary: '', impactedNodes: ['a', 'b'], impactedSubsystems: [], insightFingerprints: [], patternFingerprints: [], evidenceRefs: [], metadata: {} },
      { riskType: 'COUPLING_RISK', severity: 'MODERATE', normalizedScore: 0.4, fingerprint: 'fp2', title: 'Test2', summary: '', impactedNodes: [], impactedSubsystems: [], insightFingerprints: [], patternFingerprints: [], evidenceRefs: [], metadata: {} },
    ];
    const adj = new Map<string, string[]>([['a', ['c']], ['b', ['d']]]);
    const results = computeAggregatePropagation(correlations, adj);
    expect(results.has('fp1')).toBe(true);
    expect(results.has('fp2')).toBe(false);
  });
});
