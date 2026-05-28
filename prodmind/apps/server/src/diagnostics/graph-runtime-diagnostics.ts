export interface GraphRuntimeDiagnostics {
  totalNodes: number;
  totalEdges: number;
  queryCount: number;
  avgQueryTimeMs: number;
  cacheHitRate: number;
  timestamp: string;
}

export class GraphDiagnosticsCollector {
  private queryTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private _totalNodes = 0;
  private _totalEdges = 0;

  recordQuery(durationMs: number): void {
    this.queryTimes.push(durationMs);
    if (this.queryTimes.length > 1000) this.queryTimes.shift();
  }

  recordCacheHit(): void { this.cacheHits++; }
  recordCacheMiss(): void { this.cacheMisses++; }
  updateGraphSize(nodes: number, edges: number): void { this._totalNodes = nodes; this._totalEdges = edges; }

  collect(): GraphRuntimeDiagnostics {
    const totalQueries = this.queryTimes.length;
    const avgTime = totalQueries > 0
      ? Math.round((this.queryTimes.reduce((a, b) => a + b, 0) / totalQueries) * 100) / 100
      : 0;
    const totalCache = this.cacheHits + this.cacheMisses;
    const hitRate = totalCache > 0 ? Math.round((this.cacheHits / totalCache) * 10000) / 100 : 0;

    return {
      totalNodes: this._totalNodes,
      totalEdges: this._totalEdges,
      queryCount: totalQueries,
      avgQueryTimeMs: avgTime,
      cacheHitRate: hitRate,
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.queryTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
