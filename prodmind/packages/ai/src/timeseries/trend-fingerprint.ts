import { createHash } from 'node:crypto';
import type { ArchitectureTrend, TrendType } from './timeseries-types.ts';

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

export function fingerprintTrend(input: {
  trendType: TrendType;
  direction: string;
  normalizedSeverity: number;
  growthRate: number;
  snapshotIds: string[];
}): string {
  const ordered: Record<string, unknown> = {
    trendType: input.trendType,
    direction: input.direction,
    normalizedSeverity: Math.round(input.normalizedSeverity * 1000) / 1000,
    growthRate: Math.round(input.growthRate * 1000) / 1000,
    snapshotIds: [...input.snapshotIds].sort(),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintTrendBatch(trends: ArchitectureTrend[]): string {
  const fps = trends.map(t => t.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
