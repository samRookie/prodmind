import { describe, it, expect } from 'vitest';
import { TraversalTelemetry } from '../telemetry/traversal-telemetry.ts';
import { QueryTelemetry } from '../telemetry/query-telemetry.ts';
import { ExplorationMetricsCollector } from '../telemetry/exploration-metrics.ts';
import { PerformanceTelemetry } from '../telemetry/performance-telemetry.ts';

describe('TraversalTelemetry', () => {
  it('recordTraversal stores record', () => {
    const telemetry = new TraversalTelemetry();
    telemetry.recordTraversal('BFS', 10, 5, 'COMPLETED', 100);
    const stats = telemetry.getTraversalStats();
    expect(stats.count).toBe(1);
    expect(stats.avgNodesVisited).toBe(10);
  });

  it('getTraversalStats returns zeroes for empty', () => {
    const telemetry = new TraversalTelemetry();
    const stats = telemetry.getTraversalStats();
    expect(stats.count).toBe(0);
    expect(stats.avgDepth).toBe(0);
  });

  it('getTraversalStats computes byStrategy', () => {
    const telemetry = new TraversalTelemetry();
    telemetry.recordTraversal('BFS', 5, 2, 'COMPLETED', 50);
    telemetry.recordTraversal('DFS', 8, 3, 'COMPLETED', 75);
    const stats = telemetry.getTraversalStats();
    expect(stats.byStrategy['BFS']).toBe(1);
    expect(stats.byStrategy['DFS']).toBe(1);
  });

  it('getTraversalHistory returns records', () => {
    const telemetry = new TraversalTelemetry();
    telemetry.recordTraversal('BFS', 5, 2, 'COMPLETED', 50);
    const history = telemetry.getTraversalHistory();
    expect(history.length).toBe(1);
    expect(history[0]!.strategy).toBe('BFS');
  });

  it('clear removes all records', () => {
    const telemetry = new TraversalTelemetry();
    telemetry.recordTraversal('BFS', 5, 2, 'COMPLETED', 50);
    telemetry.clear();
    expect(telemetry.getTraversalStats().count).toBe(0);
  });

  it('getTraversalStats computes avgDepth and avgDuration', () => {
    const telemetry = new TraversalTelemetry();
    telemetry.recordTraversal('BFS', 10, 5, 'COMPLETED', 100);
    telemetry.recordTraversal('BFS', 20, 10, 'COMPLETED', 200);
    const stats = telemetry.getTraversalStats();
    expect(stats.avgDepth).toBe(7.5);
    expect(stats.avgDuration).toBe(150);
  });
});

describe('QueryTelemetry', () => {
  it('recordQuery stores record', () => {
    const telemetry = new QueryTelemetry();
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    const stats = telemetry.getQueryStats();
    expect(stats.count).toBe(1);
  });

  it('getQueryStats returns zeroes for empty', () => {
    const telemetry = new QueryTelemetry();
    const stats = telemetry.getQueryStats();
    expect(stats.count).toBe(0);
    expect(stats.mostCommon).toEqual([]);
  });

  it('getQueryStats computes cacheHitRate', () => {
    const telemetry = new QueryTelemetry();
    telemetry.recordQuery('FIND nodes', 100, 5, true);
    telemetry.recordQuery('FIND nodes', 100, 5, true);
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    const stats = telemetry.getQueryStats();
    expect(stats.cacheHitRate).toBeCloseTo(2 / 3);
  });

  it('getQueryStats computes mostCommon', () => {
    const telemetry = new QueryTelemetry();
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    telemetry.recordQuery('TRACE deps', 200, 3, false);
    const stats = telemetry.getQueryStats();
    expect(stats.mostCommon[0]!.dsl).toBe('FIND nodes');
    expect(stats.mostCommon[0]!.count).toBe(2);
  });

  it('getQueryHistory returns records', () => {
    const telemetry = new QueryTelemetry();
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    expect(telemetry.getQueryHistory().length).toBe(1);
  });

  it('clear removes all records', () => {
    const telemetry = new QueryTelemetry();
    telemetry.recordQuery('FIND nodes', 100, 5, false);
    telemetry.clear();
    expect(telemetry.getQueryStats().count).toBe(0);
  });
});

describe('ExplorationMetricsCollector', () => {
  it('recordTraversal updates metrics', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordTraversal(10, 20, 5);
    const metrics = collector.getMetrics();
    expect(metrics.traversalCount).toBe(1);
    expect(metrics.totalNodesVisited).toBe(10);
    expect(metrics.totalEdgesTraversed).toBe(20);
  });

  it('recordQuery increments count', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordQuery();
    expect(collector.getMetrics().queryCount).toBe(1);
  });

  it('recordCacheHit and recordCacheMiss update hit rate', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordQuery();
    collector.recordQuery();
    collector.recordCacheHit();
    collector.recordCacheMiss();
    const metrics = collector.getMetrics();
    expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
  });

  it('recordPath increments path count', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordPath();
    expect(collector.getMetrics().pathCount).toBe(1);
  });

  it('recordNeighborhood increments neighborhood count', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordNeighborhood();
    expect(collector.getMetrics().neighborhoodCount).toBe(1);
  });

  it('recordExplorationTime updates total time', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordExplorationTime(100);
    expect(collector.getMetrics().totalExplorationTime).toBe(100);
  });

  it('snapshot returns copy of metrics', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordTraversal(5, 10, 3);
    const snap = collector.snapshot();
    expect(snap.traversalCount).toBe(1);
  });

  it('reset clears metrics', () => {
    const collector = new ExplorationMetricsCollector();
    collector.recordTraversal(5, 10, 3);
    collector.reset();
    const metrics = collector.getMetrics();
    expect(metrics.traversalCount).toBe(0);
  });
});

describe('PerformanceTelemetry', () => {
  it('recordTiming stores measurement', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    expect(telemetry.getAverageTiming('traverse')).toBe(100);
  });

  it('getAverageTiming returns average', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    telemetry.recordTiming('traverse', 200);
    expect(telemetry.getAverageTiming('traverse')).toBe(150);
  });

  it('getMaxTiming returns max', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    telemetry.recordTiming('traverse', 300);
    expect(telemetry.getMaxTiming('traverse')).toBe(300);
  });

  it('getMinTiming returns min', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    telemetry.recordTiming('traverse', 300);
    expect(telemetry.getMinTiming('traverse')).toBe(100);
  });

  it('getTimingPercentile returns correct percentile', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 10);
    telemetry.recordTiming('traverse', 20);
    telemetry.recordTiming('traverse', 30);
    telemetry.recordTiming('traverse', 40);
    expect(telemetry.getTimingPercentile('traverse', 50)).toBe(20);
  });

  it('getAllStats returns stats for all operations', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    telemetry.recordTiming('query', 200);
    const stats = telemetry.getAllStats();
    expect(stats['traverse']).toBeDefined();
    expect(stats['query']).toBeDefined();
  });

  it('clear removes all measurements', () => {
    const telemetry = new PerformanceTelemetry();
    telemetry.recordTiming('traverse', 100);
    telemetry.clear();
    expect(telemetry.getAverageTiming('traverse')).toBe(0);
  });

  it('getAverageTiming returns 0 for unknown operation', () => {
    const telemetry = new PerformanceTelemetry();
    expect(telemetry.getAverageTiming('unknown')).toBe(0);
  });
});
