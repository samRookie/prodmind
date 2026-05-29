import type { RemediationRecord } from '../types/index.ts';

export interface RemediationSuccessAnalysis {
  successCount: number;
  successRate: number;
  topModules: Array<{ module: string; successCount: number }>;
  topActions: Array<{ actionType: string; successCount: number }>;
}

export function analyzeRemediationSuccesses(records: RemediationRecord[]): RemediationSuccessAnalysis {
  const successes = records.filter((r) => r.successScore > 0.7);
  const successRate = records.length > 0 ? successes.length / records.length : 0;

  const moduleCounts = new Map<string, number>();
  const actionCounts = new Map<string, number>();
  for (const s of successes) {
    moduleCounts.set(s.targetModule, (moduleCounts.get(s.targetModule) ?? 0) + 1);
    actionCounts.set(s.actionType, (actionCounts.get(s.actionType) ?? 0) + 1);
  }

  return {
    successCount: successes.length,
    successRate,
    topModules: [...moduleCounts.entries()]
      .map(([module, count]) => ({ module, successCount: count }))
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 5),
    topActions: [...actionCounts.entries()]
      .map(([actionType, count]) => ({ actionType, successCount: count }))
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 5),
  };
}
