import { createHash } from 'node:crypto';
import type { RiskCorrelation, RiskType, RiskSeverity } from './risk-types.ts';

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

export function fingerprintRisk(input: {
  riskType: RiskType;
  severity: RiskSeverity;
  normalizedScore: number;
  title: string;
  impactedNodes: string[];
  insightFingerprints: string[];
  patternFingerprints: string[];
}): string {
  const ordered: Record<string, unknown> = {
    riskType: input.riskType,
    severity: input.severity,
    normalizedScore: Math.round(input.normalizedScore * 1000) / 1000,
    title: input.title,
    impactedNodes: [...input.impactedNodes].sort(),
    insightFingerprints: [...input.insightFingerprints].sort(),
    patternFingerprints: [...input.patternFingerprints].sort(),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintRiskBatch(correlations: RiskCorrelation[]): string {
  const fps = correlations.map(c => c.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
