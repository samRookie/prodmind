import { describe, it, expect } from 'vitest';
import { GraphDiagnosticsCollector } from '../../diagnostics/graph-runtime-diagnostics.ts';

describe('GraphDiagnosticsCollector', () => {
  it('records queries', () => {
    const c = new GraphDiagnosticsCollector();
    c.recordQuery(10);
    c.recordQuery(20);
    const d = c.collect();
    expect(d.queryCount).toBe(2);
    expect(d.avgQueryTimeMs).toBe(15);
  });

  it('tracks cache hits', () => {
    const c = new GraphDiagnosticsCollector();
    c.recordCacheHit();
    c.recordCacheMiss();
    const d = c.collect();
    expect(d.cacheHitRate).toBe(50);
  });

  it('tracks graph size', () => {
    const c = new GraphDiagnosticsCollector();
    c.updateGraphSize(100, 200);
    const d = c.collect();
    expect(d.totalNodes).toBe(100);
    expect(d.totalEdges).toBe(200);
  });

  it('resets', () => {
    const c = new GraphDiagnosticsCollector();
    c.recordQuery(10);
    c.reset();
    expect(c.collect().queryCount).toBe(0);
  });
});
