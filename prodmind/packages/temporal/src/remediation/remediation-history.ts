import type { RemediationRecord } from '../types/index.ts';

export interface RemediationHistoryResult {
  records: RemediationRecord[];
  totalRemediations: number;
  uniqueModules: string[];
  actionTypes: string[];
  timeRange: { start: string; end: string } | null;
}

export function buildRemediationHistory(records: RemediationRecord[]): RemediationHistoryResult {
  const uniqueModules = [...new Set(records.map((r) => r.targetModule))];
  const actionTypes = [...new Set(records.map((r) => r.actionType))];
  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  return {
    records: sorted,
    totalRemediations: records.length,
    uniqueModules,
    actionTypes,
    timeRange: records.length >= 2
      ? { start: sorted[0]!.timestamp, end: sorted[sorted.length - 1]!.timestamp }
      : null,
  };
}
