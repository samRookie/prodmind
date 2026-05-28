import type { SearchCacheEntry, SearchResult } from './search-types.ts';

const MAX_CACHE_SIZE = 300;

export class SearchCache {
  private entries = new Map<string, SearchCacheEntry>();

  get(fingerprint: string): SearchResult | undefined {
    const entry = this.entries.get(fingerprint);
    if (!entry) return undefined;
    return entry.result;
  }

  set(fingerprint: string, result: SearchResult): void {
    if (this.entries.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    this.entries.set(fingerprint, {
      fingerprint, result,
      createdAt: new Date().toISOString(),
    });
  }

  has(fingerprint: string): boolean {
    return this.entries.has(fingerprint);
  }

  clear(): void {
    this.entries.clear();
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [key, entry] of this.entries) {
      const time = new Date(entry.createdAt).getTime();
      if (time < oldestTime) { oldestTime = time; oldestKey = key; }
    }
    if (oldestKey) this.entries.delete(oldestKey);
  }
}
