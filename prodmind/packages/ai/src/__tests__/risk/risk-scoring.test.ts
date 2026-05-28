import { describe, it, expect } from 'vitest';
import { computeNormalizedRiskScore, scoreToSeverity } from '../../risk/risk-scoring.ts';

describe('computeNormalizedRiskScore', () => {
  it('returns high score for critical severity with high factors', () => {
    const score = computeNormalizedRiskScore({ severity: 'CRITICAL', propagationDepth: 10, couplingDensity: 0.8, sccCentrality: 0.9, instability: 0.8, blastRadius: 0.9, architectureDepth: 12, ruleRecurrenceFrequency: 8 });
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it('returns low score for low severity with minimal factors', () => {
    const score = computeNormalizedRiskScore({ severity: 'LOW', propagationDepth: 0, couplingDensity: 0, sccCentrality: 0, instability: 0, blastRadius: 0, architectureDepth: 0, ruleRecurrenceFrequency: 0 });
    expect(score).toBeLessThan(0.3);
  });

  it('produces deterministic results', () => {
    const input = { severity: 'HIGH' as const, propagationDepth: 5, couplingDensity: 0.4, sccCentrality: 0.5, instability: 0.3, blastRadius: 0.4, architectureDepth: 6, ruleRecurrenceFrequency: 3 };
    expect(computeNormalizedRiskScore(input)).toBe(computeNormalizedRiskScore(input));
  });

  it('bounds score between 0 and 1', () => {
    const score = computeNormalizedRiskScore({ severity: 'CRITICAL', propagationDepth: 100, couplingDensity: 10, sccCentrality: 5, instability: 2, blastRadius: 3, architectureDepth: 50, ruleRecurrenceFrequency: 20 });
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe('scoreToSeverity', () => {
  it('returns CRITICAL for score >= 0.75', () => expect(scoreToSeverity(0.75)).toBe('CRITICAL'));
  it('returns HIGH for score >= 0.5', () => expect(scoreToSeverity(0.5)).toBe('HIGH'));
  it('returns MODERATE for score >= 0.25', () => expect(scoreToSeverity(0.25)).toBe('MODERATE'));
  it('returns LOW for score < 0.25', () => expect(scoreToSeverity(0.1)).toBe('LOW'));
});
