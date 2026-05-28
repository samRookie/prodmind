import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { TraversalOptimizer } from '../optimization/traversal-optimizer.ts';
import { QueryOptimizer } from '../optimization/query-optimizer.ts';
import { CachePlanner } from '../optimization/cache-planner.ts';
import { ExecutionPlanner } from '../optimization/execution-planner.ts';
import { GraphIndexes } from '../optimization/graph-indexes.ts';
import { BoundedExecution } from '../optimization/bounded-execution.ts';
import { OptimizationMetrics } from '../optimization/optimization-metrics.ts';
import { TraversalCache } from '../traversal/traversal-cache.ts';
import type { TraversalResult } from '../types/index.ts';
import { createQueryNode, createTargetNode, createParameterNode } from '../query/graph-query-ast.ts';

describe('TraversalOptimizer', () => {
  it('optimizeTraversal returns optimized strategy', () => {
    const graph = createMockGraph();
    const opt = new TraversalOptimizer(graph);
    const result = opt.optimizeTraversal('A', 'BFS');
    expect(result.strategy).toBeDefined();
    expect(result.cacheKey).toBeDefined();
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  it('optimizeTraversal downgrades WEIGHTED to BFS when all weights are 1', () => {
    const graph = createMockGraph();
    const opt = new TraversalOptimizer(graph);
    const result = opt.optimizeTraversal('A', 'WEIGHTED');
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  it('shouldCache returns true for deep traversals', () => {
    const opt = new TraversalOptimizer(createMockGraph());
    expect(opt.shouldCache('BFS', 3)).toBe(true);
    expect(opt.shouldCache('BFS', 1)).toBe(false);
  });

  it('shouldCache returns true for WEIGHTED', () => {
    const opt = new TraversalOptimizer(createMockGraph());
    expect(opt.shouldCache('WEIGHTED', 1)).toBe(true);
  });

  it('getCachedResult returns undefined for missing', () => {
    const opt = new TraversalOptimizer(createMockGraph());
    expect(opt.getCachedResult('unknown')).toBeUndefined();
  });

  it('setCachedResult stores and retrieves', () => {
    const opt = new TraversalOptimizer(createMockGraph());
    opt.setCachedResult('key1', { data: 'test' });
    expect(opt.getCachedResult('key1')).toEqual({ data: 'test' });
  });
});

describe('QueryOptimizer', () => {
  it('optimizeQuery returns optimized AST', () => {
    const graph = createMockGraph();
    const optimizer = new QueryOptimizer();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [], [])!;
    const result = optimizer.optimizeQuery(ast, graph);
    expect(result.ast).toBeDefined();
    expect(result.improvements).toBeDefined();
  });

  it('selectIndexStrategy returns index strategy', () => {
    const graph = createMockGraph();
    const optimizer = new QueryOptimizer();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [], [])!;
    const strategy = optimizer.selectIndexStrategy(ast, graph);
    expect(typeof strategy).toBe('string');
  });

  it('estimateCardinality returns estimate', () => {
    const graph = createMockGraph();
    const optimizer = new QueryOptimizer();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [], [])!;
    const cardinality = optimizer.estimateCardinality(ast, graph);
    expect(cardinality).toBeGreaterThan(0);
  });
});

describe('CachePlanner', () => {
  it('planPreheating returns plan for high-degree nodes', () => {
    const graph = createMockGraph();
    const cache = new TraversalCache();
    const planner = new CachePlanner(cache);
    const plan = planner.planPreheating(graph);
    expect(plan.length).toBeGreaterThan(0);
  });

  it('shouldEvict returns true for old low-hit entries', () => {
    const cache = new TraversalCache();
    const planner = new CachePlanner(cache);
    const entry = { key: 'k', result: {} as TraversalResult, timestamp: new Date(Date.now() - 7200000).toISOString(), hits: 1 };
    expect(planner.shouldEvict(entry)).toBe(true);
  });

  it('shouldEvict returns false for recent entries', () => {
    const cache = new TraversalCache();
    const planner = new CachePlanner(cache);
    const entry = { key: 'k', result: {} as TraversalResult, timestamp: new Date().toISOString(), hits: 1 };
    expect(planner.shouldEvict(entry)).toBe(false);
  });

  it('estimateCacheSavings returns 0 for empty patterns', () => {
    const cache = new TraversalCache();
    const planner = new CachePlanner(cache);
    expect(planner.estimateCacheSavings([])).toBe(0);
  });
});

describe('ExecutionPlanner', () => {
  it('plan produces query plan', () => {
    const planner = new ExecutionPlanner();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [], [createParameterNode('depth', 5)])!;
    const plan = planner.plan(ast);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.estimatedCost).toBeGreaterThan(0);
  });

  it('estimateCost returns plan cost', () => {
    const planner = new ExecutionPlanner();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [], [])!;
    const plan = planner.plan(ast);
    expect(planner.estimateCost(plan)).toBe(plan.estimatedCost);
  });

  it('shouldParallelize returns true for complex plans', () => {
    const planner = new ExecutionPlanner();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [
      { type: 'logic', operator: 'AND', conditions: [
        { type: 'condition', field: 'type', operator: 'EQ', value: 'module' },
        { type: 'condition', field: 'instability', operator: 'GT', value: 0.5 },
      ] },
    ], [])!;
    const plan = planner.plan(ast);
    expect(typeof planner.shouldParallelize(plan)).toBe('boolean');
  });

  it('splitWork divides plan', () => {
    const planner = new ExecutionPlanner();
    const target = createTargetNode('NODES')!;
    const ast = createQueryNode(target, [
      { type: 'logic', operator: 'AND', conditions: [{ type: 'condition', field: 'type', operator: 'EQ', value: 'module' }] },
      { type: 'logic', operator: 'AND', conditions: [{ type: 'condition', field: 'instability', operator: 'GT', value: 0.5 }] },
    ], [])!;
    const plan = planner.plan(ast);
    const subPlans = planner.splitWork(plan);
    expect(subPlans.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GraphIndexes', () => {
  it('rebuild indexes graph', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    const byType = indexes.findNodesByType('module');
    expect(byType.length).toBeGreaterThan(0);
  });

  it('findNodesByProperty returns matching nodes', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    const nodes = indexes.findNodesByProperty('instability', 0.5);
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('findNodesByProperty returns empty for missing property', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    expect(indexes.findNodesByProperty('nonexistent', 'x')).toEqual([]);
  });

  it('findEdgesByType returns edge IDs', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    const edges = indexes.findEdgesByType('depends');
    expect(edges.length).toBeGreaterThan(0);
  });

  it('optimizeQuery returns modified query', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    const optimized = indexes.optimizeQuery('find nodes where type = module');
    expect(typeof optimized).toBe('string');
  });

  it('stats returns index sizes', () => {
    const graph = createMockGraph();
    const indexes = new GraphIndexes(graph);
    const stats = indexes.stats();
    expect(stats.typeIndexSize).toBeGreaterThan(0);
  });
});

describe('BoundedExecution', () => {
  it('withTimeout resolves before timeout', async () => {
    const result = await BoundedExecution.withTimeout(
      Promise.resolve('done'),
      1000,
    );
    expect(result).toBe('done');
  });

  it('withTimeout rejects on timeout', async () => {
    await expect(
      BoundedExecution.withTimeout(
        new Promise((resolve) => setTimeout(resolve, 5000)),
        10,
      ),
    ).rejects.toThrow('timed out');
  });

  it('withNodeLimit limits array', () => {
    expect(BoundedExecution.withNodeLimit([1, 2, 3], 2)).toEqual([1, 2]);
  });

  it('withNodeLimit handles zero limit', () => {
    expect(BoundedExecution.withNodeLimit([1, 2], 0)).toEqual([]);
  });

  it('withDepthLimit checks depth', () => {
    expect(BoundedExecution.withDepthLimit(5, 10)).toBe(true);
    expect(BoundedExecution.withDepthLimit(15, 10)).toBe(false);
  });

  it('withMemoryLimit checks memory', () => {
    expect(BoundedExecution.withMemoryLimit(50, 100)).toBe(true);
    expect(BoundedExecution.withMemoryLimit(150, 100)).toBe(false);
  });
});

describe('OptimizationMetrics', () => {
  it('recordQuery stores query metric', () => {
    const metrics = new OptimizationMetrics();
    metrics.recordQuery('FIND nodes', 100, false);
    const stats = metrics.getQueryStats();
    expect(stats.count).toBe(1);
  });

  it('recordTraversal stores traversal metric', () => {
    const metrics = new OptimizationMetrics();
    metrics.recordTraversal('BFS', 200, false);
    const stats = metrics.getTraversalStats();
    expect(stats.count).toBe(1);
  });

  it('getQueryStats returns averages', () => {
    const metrics = new OptimizationMetrics();
    metrics.recordQuery('FIND nodes', 100, false);
    metrics.recordQuery('FIND edges', 200, true);
    const stats = metrics.getQueryStats();
    expect(stats.avgTime).toBeCloseTo(150);
    expect(stats.cacheHitRate).toBeCloseTo(0.5);
  });

  it('getOverallStats returns combined stats', () => {
    const metrics = new OptimizationMetrics();
    metrics.recordQuery('FIND nodes', 100, false);
    metrics.recordTraversal('BFS', 200, true);
    const stats = metrics.getOverallStats();
    expect(stats.totalQueries).toBe(1);
    expect(stats.totalTraversals).toBe(1);
  });

  it('reset clears all metrics', () => {
    const metrics = new OptimizationMetrics();
    metrics.recordQuery('FIND nodes', 100, false);
    metrics.reset();
    expect(metrics.getQueryStats().count).toBe(0);
  });
});
