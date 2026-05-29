import type { RemediationRecord } from '../types/index.ts';

export interface RemediationFailureAnalysis {
  failureCount: number;
  failureRate: number;
  commonFailurePatterns: Array<{ actionType: string; failureCount: number; avgRegression: number }>;
  worstModule: string;
}

export function analyzeRemediationFailures(records: RemediationRecord[]): RemediationFailureAnalysis {
  const failures = records.filter((r) => r.successScore <= 0.5);
  const failureRate = records.length > 0 ? failures.length / records.length : 0;

  const patternGroups = new Map<string, { failureCount: number; regressionSum: number }>();
  for (const f of failures) {
    const group = patternGroups.get(f.actionType) ?? { failureCount: 0, regressionSum: 0 };
    group.failureCount++;
    group.regressionSum += f.regressionScore;
    patternGroups.set(f.actionType, group);
  }

  const moduleFailures = new Map<string, number>();
  for (const f of failures) {
    moduleFailures.set(f.targetModule, (moduleFailures.get(f.targetModule) ?? 0) + 1);
  }

  const commonFailurePatterns = [...patternGroups.entries()]
    .map(([actionType, g]) => ({ actionType, failureCount: g.failureCount, avgRegression: g.regressionSum / g.failureCount }))
    .sort((a, b) => b.failureCount - a.failureCount);

  const worstModule = [...moduleFailures.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  return { failureCount: failures.length, failureRate, commonFailurePatterns, worstModule };
}
