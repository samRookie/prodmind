import { createHash } from 'node:crypto';
import type { PatternDetection, ArchitecturePattern, AntiPattern, PatternSeverity } from './pattern-types.ts';

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

export function fingerprintPattern(input: {
  patternType: ArchitecturePattern | AntiPattern;
  isAntiPattern: boolean;
  severity: PatternSeverity;
  title: string;
  summary: string;
  impactedNodes: string[];
  metricEvidence: { metricType: string; metricValue: number }[];
}): string {
  const ordered: Record<string, unknown> = {
    patternType: input.patternType,
    isAntiPattern: input.isAntiPattern,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    impactedNodes: [...input.impactedNodes].sort(),
    metricEvidence: input.metricEvidence.map(e => ({ metricType: e.metricType, metricValue: e.metricValue }))
      .sort((a, b) => a.metricType.localeCompare(b.metricType) || a.metricValue - b.metricValue),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintPatternBatch(detections: PatternDetection[]): string {
  const fps = detections.map(d => d.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
