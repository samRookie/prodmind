import type { RemediationRecord } from '../types/index.ts';

export interface RemediationRegressionResult {
  hasRegression: boolean;
  regressedRemediations: RemediationRecord[];
  regressionRate: number;
}

export function detectRemediationRegression(records: RemediationRecord[]): RemediationRegressionResult {
  const regressed = records.filter((r) => r.regressionScore > 0.5);
  return {
    hasRegression: regressed.length > 0,
    regressedRemediations: regressed,
    regressionRate: records.length > 0 ? regressed.length / records.length : 0,
  };
}
