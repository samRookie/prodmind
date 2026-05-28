import { describe, it, expect } from 'vitest';
import { computeRecommendationPriority } from '../../recommendations/recommendation-priority.ts';

describe('computeRecommendationPriority', () => {
  it('returns IMMEDIATE for CRITICAL severity with high propagation risk', () => {
    const result = computeRecommendationPriority('STABILITY', 'CRITICAL', 0.9, 0.8, 0.7, 0.6, 0.5, 0.8, 5);
    expect(result.label).toBe('IMMEDIATE');
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns IMMEDIATE for HIGH severity with moderate factors', () => {
    const result = computeRecommendationPriority('DECOUPLING', 'HIGH', 0.6, 0.5, 0.4, 0.3, 0.2, 0.3, 2);
    expect(result.label).toBe('IMMEDIATE');
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns LOW for LOW severity with no extra factors', () => {
    const result = computeRecommendationPriority('PERFORMANCE', 'LOW');
    expect(result.label).toBe('LOW');
    expect(result.score).toBeLessThan(0.4);
  });

  it('produces deterministic results for same inputs', () => {
    const a = computeRecommendationPriority('REFACTORING', 'HIGH', 0.5);
    const b = computeRecommendationPriority('REFACTORING', 'HIGH', 0.5);
    expect(a.score).toBe(b.score);
    expect(a.label).toBe(b.label);
  });

  it('handles zero values gracefully', () => {
    const result = computeRecommendationPriority('MODULARIZATION', 'MODERATE', 0, 0, 0, 0, 0, 0, 0);
    expect(['LOW', 'MEDIUM']).toContain(result.label);
  });
});
