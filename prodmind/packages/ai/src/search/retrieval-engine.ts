import type { RetrievalQuery, RetrievalResult, SearchIndexEntry } from './search-types.ts';
import { createHash } from 'node:crypto';

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

export class RetrievalEngine {
  private entries = new Map<string, SearchIndexEntry>();

  register(entries: SearchIndexEntry[]): void {
    for (const e of entries) {
      this.entries.set(e.id, e);
    }
  }

  retrieve<T = unknown>(query: RetrievalQuery): RetrievalResult<T> {
    const start = Date.now();
    const types = new Set(query.types);
    let items = [...this.entries.values()].filter(e => types.has(e.type));

    if (query.filters) {
      for (const f of query.filters) {
        items = items.filter(item => {
          const val = (item as unknown as Record<string, unknown>)[f.field];
          if (f.comparator === 'EQ') return val === f.value;
          if (f.comparator === 'IN') return Array.isArray(f.value) && (f.value as unknown[]).includes(val);
          return true;
        });
      }
    }

    items.sort((a, b) => a.id.localeCompare(b.id));

    const total = items.length;
    const sliced = items.slice(query.offset, query.offset + query.limit);
    const fp = createHash('sha256').update(canonicalJson({ snapshotId: query.snapshotId, types: [...types].sort() })).digest('hex');

    return {
      snapshotId: query.snapshotId,
      data: sliced as T[],
      total,
      fingerprint: fp,
      executionTimeMs: Date.now() - start,
    };
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
