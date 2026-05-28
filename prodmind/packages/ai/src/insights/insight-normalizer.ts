import type { Insight, EvidenceRef, InsightCategory, InsightSeverity, InsightScope } from './insight-types.ts';

export interface NormalizedInsight {
  type: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  fingerprint: string;
  title: string;
  summary: string;
  evidenceRefs: NormalizedEvidenceRef[];
  metadata: Record<string, unknown>;
}

export interface NormalizedEvidenceRef {
  nodeId?: string;
  edgeId?: string;
  metricType?: string;
  metricValue?: number;
  description: string;
}

export function normalizeInsight(insight: Insight): NormalizedInsight {
  return {
    type: insight.type,
    severity: insight.severity,
    scope: insight.scope,
    fingerprint: insight.fingerprint,
    title: insight.title,
    summary: insight.summary,
    evidenceRefs: normalizeEvidenceList(insight.evidence),
    metadata: normalizeMetadata(insight.metadata),
  };
}

export function normalizeEvidenceList(evidence: EvidenceRef[]): NormalizedEvidenceRef[] {
  return evidence
    .map((e) => ({
      ...(e.nodeId !== undefined ? { nodeId: e.nodeId } : {}),
      ...(e.edgeId !== undefined ? { edgeId: e.edgeId } : {}),
      ...(e.metricType !== undefined ? { metricType: e.metricType } : {}),
      ...(e.metricValue !== undefined ? { metricValue: e.metricValue } : {}),
      description: e.description,
    }))
    .sort((a, b) => {
      const byDesc = a.description.localeCompare(b.description);
      if (byDesc !== 0) return byDesc;
      return (a.nodeId ?? '').localeCompare(b.nodeId ?? '');
    });
}

export function normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(metadata).sort();
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    result[key] = metadata[key];
  }
  return result;
}

export function normalizeInsightBatch(insights: Insight[]): NormalizedInsight[] {
  return insights
    .map(normalizeInsight)
    .sort((a, b) => {
      const byType = a.type.localeCompare(b.type);
      if (byType !== 0) return byType;
      const bySeverity = b.severity.localeCompare(a.severity);
      if (bySeverity !== 0) return bySeverity;
      return a.fingerprint.localeCompare(b.fingerprint);
    });
}
