import type { QueryResult } from '../graph/graph-query.ts';

interface CacheEntry {
  readonly result: QueryResult;
  readonly createdAt: number;
}

export class RetrievalCache {
  private readonly _cache: Map<string, CacheEntry> = new Map();
  private _maxSize: number;
  private _ttlMs: number;

  constructor(maxSize = 100, ttlMs = 60_000) {
    this._maxSize = maxSize;
    this._ttlMs = ttlMs;
  }

  get(key: string): QueryResult | undefined {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.createdAt > this._ttlMs) {
      this._cache.delete(key);
      return undefined;
    }
    return entry.result;
  }

  set(key: string, result: QueryResult): void {
    if (this._cache.size >= this._maxSize) {
      const oldest = this._cache.entries().next();
      if (oldest.value) this._cache.delete(oldest.value[0]);
    }
    this._cache.set(key, { result, createdAt: Date.now() });
  }

  invalidate(key: string): void {
    this._cache.delete(key);
  }

  clear(): void {
    this._cache.clear();
  }

  get size(): number {
    return this._cache.size;
  }
}
