export class OptimizationMetrics {
  private metrics: Map<string, { count: number; totalTime: number; cacheHits: number; cacheMisses: number }>;

  constructor() {
    this.metrics = new Map();
  }

  public recordQuery(query: string, time: number, cached: boolean): void {
    const key = `query:${query}`;
    const entry = this.metrics.get(key) ?? { count: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 };
    entry.count++;
    entry.totalTime += time;
    if (cached) entry.cacheHits++;
    else entry.cacheMisses++;
    this.metrics.set(key, entry);
  }

  public recordTraversal(strategy: string, time: number, cached: boolean): void {
    const key = `traversal:${strategy}`;
    const entry = this.metrics.get(key) ?? { count: 0, totalTime: 0, cacheHits: 0, cacheMisses: 0 };
    entry.count++;
    entry.totalTime += time;
    if (cached) entry.cacheHits++;
    else entry.cacheMisses++;
    this.metrics.set(key, entry);
  }

  public getQueryStats(): { count: number; avgTime: number; cacheHitRate: number } {
    let count = 0;
    let totalTime = 0;
    let cacheHits = 0;
    let totalCached = 0;
    for (const [key, entry] of this.metrics) {
      if (key.startsWith('query:')) {
        count += entry.count;
        totalTime += entry.totalTime;
        cacheHits += entry.cacheHits;
        totalCached += entry.cacheHits + entry.cacheMisses;
      }
    }
    return {
      count,
      avgTime: count > 0 ? totalTime / count : 0,
      cacheHitRate: totalCached > 0 ? cacheHits / totalCached : 0,
    };
  }

  public getTraversalStats(): { count: number; avgTime: number; cacheHitRate: number } {
    let count = 0;
    let totalTime = 0;
    let cacheHits = 0;
    let totalCached = 0;
    for (const [key, entry] of this.metrics) {
      if (key.startsWith('traversal:')) {
        count += entry.count;
        totalTime += entry.totalTime;
        cacheHits += entry.cacheHits;
        totalCached += entry.cacheHits + entry.cacheMisses;
      }
    }
    return {
      count,
      avgTime: count > 0 ? totalTime / count : 0,
      cacheHitRate: totalCached > 0 ? cacheHits / totalCached : 0,
    };
  }

  public getOverallStats(): { totalQueries: number; totalTraversals: number; overallCacheHitRate: number } {
    const queryStats = this.getQueryStats();
    const traversalStats = this.getTraversalStats();
    let cacheHits = 0;
    let totalCached = 0;
    for (const entry of this.metrics.values()) {
      cacheHits += entry.cacheHits;
      totalCached += entry.cacheHits + entry.cacheMisses;
    }
    return {
      totalQueries: queryStats.count,
      totalTraversals: traversalStats.count,
      overallCacheHitRate: totalCached > 0 ? cacheHits / totalCached : 0,
    };
  }

  public reset(): void {
    this.metrics.clear();
  }
}
