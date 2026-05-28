import type { Insight } from '../types/index.ts';

export function serializeInsight(insight: Insight): string {
  const canonical = {
    id: insight.id,
    category: insight.category,
    severity: insight.severity,
    status: insight.status,
    title: insight.title,
    description: insight.description,
    summary: insight.summary,
    fingerprint: insight.fingerprint,
    context: insight.context,
    evidence: insight.evidence.map(e => ({
      id: e.id,
      type: e.type,
      source: e.source,
      description: e.description,
      data: e.data,
      fingerprint: e.fingerprint,
    })),
    scores: insight.scores,
    timestamp: insight.timestamp,
    sourceGraphSnapshot: insight.sourceGraphSnapshot,
    remediationIds: insight.remediationIds,
    relatedInsightIds: insight.relatedInsightIds,
  };
  return JSON.stringify(canonical, null, 2);
}

export function deserializeInsight(json: string): Insight {
  return JSON.parse(json) as Insight;
}

export function canonicalizeEvidence(evidence: Array<{ id: string; fingerprint: string }>): string {
  const sorted = [...evidence].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map(e => `${e.id}:${e.fingerprint}`).join('|');
}
