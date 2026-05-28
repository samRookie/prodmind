import { createHash } from 'node:crypto';
import type { Narrative, NarrativeType, NarrativeSeverity } from './narrative-types.ts';

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

export function fingerprintNarrative(input: {
  narrativeType: NarrativeType;
  severity: NarrativeSeverity;
  title: string;
  summary: string;
  evidenceFingerprints: string[];
  impactedSystems: string[];
}): string {
  const ordered: Record<string, unknown> = {
    narrativeType: input.narrativeType,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    evidenceFingerprints: [...input.evidenceFingerprints].sort(),
    impactedSystems: [...input.impactedSystems].sort(),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintNarrativeBatch(narratives: Narrative[]): string {
  const fps = narratives.map(n => n.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
