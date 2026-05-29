import type { RemediationRecord } from '../types/index.ts';

export interface RemediationRegressionResult {
  hasRegression: boolean;
  failedRemediations: RemediationRecord[];
  successRate: number;
  recurringFailurePatterns: string[];
}

export function detectRemediationRegression(records: RemediationRecord[]): RemediationRegressionResult {
  const failed = records.filter((r) => r.regressionScore > 0.3);
  const successRate = records.length > 0
    ? records.filter((r) => r.successScore > 0.7).length / records.length
    : 0;
  const failedModules = [...new Set(failed.map((r) => r.targetModule))];
  return {
    hasRegression: failed.length > 0,
    failedRemediations: failed,
    successRate,
    recurringFailurePatterns: failedModules.length > 0
      ? failedModules.map((m) => `Recurring failures in ${m}`)
      : [],
  };
}
