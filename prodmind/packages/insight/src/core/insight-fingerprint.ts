import type { InsightCategory, InsightSeverity } from '../types/index.ts';
import { computeHash } from '../utils/index.ts';

export function computeInsightFingerprint(
  category: InsightCategory,
  severity: InsightSeverity,
  title: string,
  contextIds: string[],
  evidenceFingerprints: string[],
): string {
  const sortedContextIds = [...contextIds].sort();
  const sortedEvidence = [...evidenceFingerprints].sort();
  const payload = [
    category,
    severity,
    title,
    ...sortedContextIds,
    ...sortedEvidence,
  ].join('|');
  return computeHash(payload);
}

export function computeEvidenceFingerprint(
  source: string,
  data: Record<string, unknown>,
): string {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return computeHash(`${source}:${canonical}`);
}
