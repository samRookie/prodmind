import { createHash } from 'node:crypto';
import type { SearchQuery, SearchResult, SearchIndex } from './search-types.ts';

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${canonicalJson(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return String(value);
}

export function fingerprintSearchQuery(query: SearchQuery): string {
  const ordered = {
    searchType: query.searchType,
    term: query.term,
    mode: query.mode,
    limit: query.limit,
    offset: query.offset,
    scope: query.scope ?? null,
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintSearchResults(results: SearchResult): string {
  const matchFps = results.matches.map(m => m.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(matchFps)).digest('hex');
}

export function fingerprintSearchIndex(index: SearchIndex): string {
  const entryData = index.entries.map(e => `${e.id}:${e.label}`).sort();
  return createHash('sha256').update(canonicalJson(entryData)).digest('hex');
}
