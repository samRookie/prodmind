import { describe, it, expect } from 'vitest';
import { rankRecommendations, topRecommendations } from '../../recommendations/recommendation-ranking.ts';
import type { Recommendation } from '../../recommendations/recommendation-types.ts';

function makeRec(overrides: Partial<Recommendation>): Recommendation {
  return {
    category: 'REFACTORING', severity: 'MODERATE', priority: 'MEDIUM', priorityScore: 0.5,
    fingerprint: 'fp-default', title: 'Test', summary: 'Test summary', rationale: 'Because',
    impactedNodes: [], impactedSubsystems: [], evidenceRefs: [], remediation: { templateId: 'test', strategy: 'test', description: '', parameters: {}, expectedImpact: '' },
    metadata: {}, ...overrides,
  };
}

describe('rankRecommendations', () => {
  it('sorts by priority score descending', () => {
    const recs = [makeRec({ priorityScore: 0.3, fingerprint: 'a' }), makeRec({ priorityScore: 0.9, fingerprint: 'b' }), makeRec({ priorityScore: 0.6, fingerprint: 'c' })];
    const ranked = rankRecommendations(recs);
    expect(ranked[0]!.priorityScore).toBe(0.9);
    expect(ranked[1]!.priorityScore).toBe(0.6);
    expect(ranked[2]!.priorityScore).toBe(0.3);
  });

  it('uses fingerprint as tiebreaker for equal scores', () => {
    const recs = [makeRec({ priorityScore: 0.5, fingerprint: 'z' }), makeRec({ priorityScore: 0.5, fingerprint: 'a' })];
    const ranked = rankRecommendations(recs);
    expect(ranked[0]!.fingerprint).toBe('a');
    expect(ranked[1]!.fingerprint).toBe('z');
  });

  it('does not mutate original array', () => {
    const recs = [makeRec({ priorityScore: 0.3 }), makeRec({ priorityScore: 0.9 })];
    const copy = [...recs];
    rankRecommendations(recs);
    expect(recs).toEqual(copy);
  });
});

describe('topRecommendations', () => {
  it('returns top N recommendations', () => {
    const recs = [makeRec({ priorityScore: 0.9 }), makeRec({ priorityScore: 0.6 }), makeRec({ priorityScore: 0.3 })];
    const top = topRecommendations(recs, 2);
    expect(top).toHaveLength(2);
    expect(top[0]!.priorityScore).toBe(0.9);
    expect(top[1]!.priorityScore).toBe(0.6);
  });

  it('returns all if count exceeds length', () => {
    const recs = [makeRec({}), makeRec({})];
    const top = topRecommendations(recs, 10);
    expect(top).toHaveLength(2);
  });
});
