import { createHash } from 'node:crypto';
import type { CognitionIndex, IndexEntry } from './indexing-types.ts';

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${canonicalJson(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return String(value);
}

export function fingerprintIndex(index: CognitionIndex): string {
  const entryFps = index.entries.map(e => e.fingerprint).sort();
  return createHash('sha256').update(canonicalJson({ indexType: index.indexType, entries: entryFps })).digest('hex');
}

export function fingerprintIndexEntry(entry: IndexEntry): string {
  return createHash('sha256').update(canonicalJson({ id: entry.id, key: entry.key, value: entry.value })).digest('hex');
}
