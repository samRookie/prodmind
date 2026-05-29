import type { DegradationScore } from '../scoring/degradation-scoring.ts';
import type { AuditEntry } from './forecast-audit.ts';

export function auditDegradation(score: DegradationScore): AuditEntry[] {
  return [
    {
      timestamp: new Date().toISOString(),
      check: 'degradation.score_range',
      passed: score.score >= 0 && score.score <= 1,
      details: `Score: ${score.score}`,
    },
    {
      timestamp: new Date().toISOString(),
      check: 'degradation.level',
      passed: ['none', 'low', 'moderate', 'severe', 'critical'].includes(score.level),
      details: `Level: ${score.level}`,
    },
    ...score.factors.map((f) => ({
      timestamp: new Date().toISOString(),
      check: `degradation.factor.${f.name}`,
      passed: isFinite(f.contribution),
      details: `${f.name} contribution: ${f.contribution}`,
    })),
  ];
}
