import type { RemediationRecord } from '../types/index.ts';

export interface RemediationEffectivenessResult {
  overallEffectiveness: number;
  successRate: number;
  averageImpact: number;
  averageRegression: number;
  trend: 'improving' | 'declining' | 'stable';
}

export function analyzeRemediationEffectiveness(records: RemediationRecord[]): RemediationEffectivenessResult {
  if (records.length === 0) {
    return { overallEffectiveness: 0, successRate: 0, averageImpact: 0, averageRegression: 0, trend: 'stable' };
  }
  const successRate = records.filter((r) => r.successScore > 0.7).length / records.length;
  const averageImpact = records.reduce((s, r) => s + r.impactScore, 0) / records.length;
  const averageRegression = records.reduce((s, r) => s + r.regressionScore, 0) / records.length;
  const overallEffectiveness = successRate * averageImpact * (1 - averageRegression);
  const recentRecords = records.slice(-3);
  const recentSuccess = recentRecords.length > 0
    ? recentRecords.filter((r) => r.successScore > 0.7).length / recentRecords.length
    : 0;
  return {
    overallEffectiveness,
    successRate,
    averageImpact,
    averageRegression,
    trend: recentSuccess > successRate ? 'improving' : recentSuccess < successRate ? 'declining' : 'stable',
  };
}
