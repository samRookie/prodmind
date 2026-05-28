import { describe, it, expect } from 'vitest';
import { detectRecommendationChurn } from '../../diff/recommendation-diff.ts';
import type { DiffInput } from '../../diff/diff-types.ts';

describe('RecommendationDiff', () => {
  it('detects new risk categories as churn', () => {
    const input: DiffInput = {
      previousSnapshotId: 'p', currentSnapshotId: 'c',
      previousRisks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.5, impactedNodes: [] }],
      currentRisks: [{ riskType: 'STABILITY_RISK', severity: 'HIGH', normalizedScore: 0.5, impactedNodes: [] }, { riskType: 'COUPLING_RISK', severity: 'CRITICAL', normalizedScore: 0.9, impactedNodes: [] }],
    };
    const diffs = detectRecommendationChurn(input);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.some(d => d.diffType === 'RISK_INCREASED')).toBe(true);
  });
});
