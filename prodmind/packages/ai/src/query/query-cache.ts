import type { QueryCacheEntry, QueryResult } from './query-types.ts';

const MAX_CACHE_SIZE = 500;

export class QueryCache {
  private entries = new Map<string, QueryCacheEntry>();

  get(fingerprint: string): QueryResult | undefined {
    const entry = this.entries.get(fingerprint);
    if (!entry) return undefined;
    return entry.result;
  }

  set(fingerprint: string, result: QueryResult): void {
    if (this.entries.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    this.entries.set(fingerprint, {
      fingerprint,
      result,
      createdAt: new Date().toISOString(),
    });
  }

  has(fingerprint: string): boolean {
    return this.entries.has(fingerprint);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of this.entries) {
      const time = new Date(entry.createdAt).getTime();
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    if (oldestKey) this.entries.delete(oldestKey);
  }

  snapshot(): QueryCacheEntry[] {
    return [...this.entries.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
