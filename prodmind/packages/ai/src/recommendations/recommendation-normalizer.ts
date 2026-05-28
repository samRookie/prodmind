import type { Recommendation } from './recommendation-types.ts';

export interface NormalizedRecommendation {
  category: string;
  severity: string;
  priority: string;
  priorityScore: number;
  fingerprint: string;
  title: string;
  summary: string;
  rationale: string;
  impactedNodes: string[];
  impactedSubsystems: string[];
  evidenceRefs: { description: string }[];
  remediation: { templateId: string; strategy: string };
  metadata: Record<string, unknown>;
}

export function normalizeRecommendation(rec: Recommendation): NormalizedRecommendation {
  return {
    category: rec.category,
    severity: rec.severity,
    priority: rec.priority,
    priorityScore: rec.priorityScore,
    fingerprint: rec.fingerprint,
    title: rec.title,
    summary: rec.summary,
    rationale: rec.rationale,
    impactedNodes: [...rec.impactedNodes].sort(),
    impactedSubsystems: [...rec.impactedSubsystems].sort(),
    evidenceRefs: rec.evidenceRefs.map(e => ({ description: e.description })).sort((a, b) => a.description.localeCompare(b.description)),
    remediation: { templateId: rec.remediation.templateId, strategy: rec.remediation.strategy },
    metadata: Object.keys(rec.metadata).sort().reduce((acc, k) => { acc[k] = rec.metadata[k]; return acc; }, {} as Record<string, unknown>),
  };
}

export function normalizeRecommendationBatch(recs: Recommendation[]): NormalizedRecommendation[] {
  return recs.map(normalizeRecommendation).sort((a, b) => b.priorityScore - a.priorityScore || a.fingerprint.localeCompare(b.fingerprint));
}
