import { createHash } from 'node:crypto';
import type { Insight, InsightCategory, InsightSeverity, InsightScope, EvidenceRef } from './insight-types.ts';

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

export function fingerprintEvidenceRef(ref: EvidenceRef): string {
  const ordered: Record<string, unknown> = {};
  if (ref.nodeId !== undefined) ordered.nodeId = ref.nodeId;
  if (ref.edgeId !== undefined) ordered.edgeId = ref.edgeId;
  if (ref.metricType !== undefined) ordered.metricType = ref.metricType;
  if (ref.metricValue !== undefined) ordered.metricValue = ref.metricValue;
  ordered.description = ref.description;
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintInsight(input: {
  type: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  title: string;
  summary: string;
  evidence: EvidenceRef[];
  metadata: Record<string, unknown>;
}): string {
  const ordered: Record<string, unknown> = {
    type: input.type,
    severity: input.severity,
    scope: input.scope,
    title: input.title,
    summary: input.summary,
    evidence: input.evidence.map((e) => ({
      ...(e.nodeId !== undefined ? { nodeId: e.nodeId } : {}),
      ...(e.edgeId !== undefined ? { edgeId: e.edgeId } : {}),
      ...(e.metricType !== undefined ? { metricType: e.metricType } : {}),
      ...(e.metricValue !== undefined ? { metricValue: e.metricValue } : {}),
      description: e.description,
    })).sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b))),
    metadata: input.metadata,
  };

  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintInsightBatch(insights: Insight[]): string {
  const fps = insights.map((i) => i.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
