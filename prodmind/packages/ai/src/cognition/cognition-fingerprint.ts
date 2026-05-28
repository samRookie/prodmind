import { createHash } from 'node:crypto';
import type { CognitionSnapshot, CognitionType } from './cognition-types.ts';

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

export function fingerprintCognition(input: {
  cognitionType: CognitionType;
  architectureSummary: string;
  dominantRisks: { riskType: string; normalizedScore: number }[];
  dominantPatterns: { patternType: string; confidence: number }[];
  healthScore: number;
}): string {
  const ordered: Record<string, unknown> = {
    cognitionType: input.cognitionType,
    architectureSummary: input.architectureSummary,
    dominantRisks: input.dominantRisks.map(r => ({ riskType: r.riskType, normalizedScore: Math.round(r.normalizedScore * 1000) / 1000 })).sort((a, b) => a.riskType.localeCompare(b.riskType)),
    dominantPatterns: input.dominantPatterns.map(p => ({ patternType: p.patternType, confidence: Math.round(p.confidence * 1000) / 1000 })).sort((a, b) => a.patternType.localeCompare(b.patternType)),
    healthScore: Math.round(input.healthScore * 1000) / 1000,
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintCognitionBatch(snapshots: CognitionSnapshot[]): string {
  const fps = snapshots.map(s => s.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
