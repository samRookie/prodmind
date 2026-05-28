import type { TraversalCacheEntry } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export class TraversalCache {
  private cache: Map<string, TraversalCacheEntry>;
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map<string, TraversalCacheEntry>();
    this.maxSize = maxSize;
  }

  public get(key: string): TraversalCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      entry.hits++;
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry;
    }
    return undefined;
  }

  public set(key: string, entry: Omit<TraversalCacheEntry, 'timestamp' | 'hits'>): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) {
        this.cache.delete(oldest.value);
      }
    }

    this.cache.set(key, {
      ...entry,
      timestamp: nowISO(),
      hits: 0,
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public stats(): { size: number; maxSize: number; entries: Array<{ key: string; hits: number; timestamp: string }> } {
    const entries: Array<{ key: string; hits: number; timestamp: string }> = [];
    for (const [key, entry] of this.cache) {
      entries.push({ key, hits: entry.hits, timestamp: entry.timestamp });
    }
    return { size: this.cache.size, maxSize: this.maxSize, entries };
  }
}
