import type { RemediationRecord } from '../types/index.ts';

export interface RemediationComparisonResult {
  bestActionType: string;
  worstActionType: string;
  actionTypeEffectiveness: Array<{ actionType: string; avgSuccess: number; count: number }>;
}

export function compareRemediationActions(records: RemediationRecord[]): RemediationComparisonResult {
  const groups = new Map<string, { successSum: number; count: number }>();
  for (const r of records) {
    const group = groups.get(r.actionType) ?? { successSum: 0, count: 0 };
    group.successSum += r.successScore;
    group.count++;
    groups.set(r.actionType, group);
  }
  const actionTypeEffectiveness = [...groups.entries()]
    .map(([actionType, g]) => ({ actionType, avgSuccess: g.successSum / g.count, count: g.count }))
    .sort((a, b) => b.avgSuccess - a.avgSuccess);
  return {
    bestActionType: actionTypeEffectiveness[0]?.actionType ?? '',
    worstActionType: actionTypeEffectiveness[actionTypeEffectiveness.length - 1]?.actionType ?? '',
    actionTypeEffectiveness,
  };
}
