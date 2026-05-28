import { createHash } from 'node:crypto';
import type { Recommendation, RecommendationCategory, RecommendationSeverity } from './recommendation-types.ts';

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    const items = value.map(canonicalJson);
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((k) => `${canonicalJson(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(',')}}`;
  }
  return String(value);
}

export function fingerprintRecommendation(input: {
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;
  summary: string;
  rationale: string;
  impactedNodes: string[];
  evidenceRefs: { description: string }[];
  remediation: { templateId: string; strategy: string };
}): string {
  const ordered: Record<string, unknown> = {
    category: input.category,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    rationale: input.rationale,
    impactedNodes: [...input.impactedNodes].sort(),
    evidenceRefs: input.evidenceRefs.map(e => ({ description: e.description })).sort((a, b) => a.description.localeCompare(b.description)),
    remediation: { templateId: input.remediation.templateId, strategy: input.remediation.strategy },
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintRecommendationBatch(recommendations: Recommendation[]): string {
  const fps = recommendations.map(r => r.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
