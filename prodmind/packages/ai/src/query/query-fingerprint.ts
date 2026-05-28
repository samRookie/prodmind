import { createHash } from 'node:crypto';
import type { ParsedQuery } from './query-types.ts';

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

export function fingerprintQuery(query: ParsedQuery): string {
  const ordered: Record<string, unknown> = {
    queryType: query.queryType,
    filters: [...query.filters].sort((a, b) => a.field.localeCompare(b.field)).map(f => ({ field: f.field, comparator: f.comparator, value: f.value })),
    sorts: [...query.sorts].sort((a, b) => a.field.localeCompare(b.field)),
    scope: query.scope,
    limit: query.limit,
    offset: query.offset,
    historicalRange: query.historicalRange ?? null,
    snapshotId: query.snapshotId ?? null,
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}
