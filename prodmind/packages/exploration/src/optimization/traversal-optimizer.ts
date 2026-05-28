import type { NodeId, TraversalStrategy, TraversalCacheEntry } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalCache } from '../traversal/traversal-cache.ts';
import { computeHash } from '../utils/index.ts';

export class TraversalOptimizer {
  private cache: TraversalCache;
  private graph: GraphContract;

  constructor(graph: GraphContract, cache?: TraversalCache) {
    this.graph = graph;
    this.cache = cache ?? new TraversalCache();
  }

  public optimizeTraversal(
    startNode: NodeId,
    strategy: TraversalStrategy,
    options?: Record<string, unknown>,
  ): { strategy: TraversalStrategy; cacheKey: string; estimatedCost: number } {
    const neighbors = this.graph.getNeighbors(startNode);
    let optimizedStrategy = strategy;

    if (neighbors.length === 0) {
      optimizedStrategy = 'BFS';
    } else if (strategy === 'WEIGHTED' && neighbors.every((_n) => {
      const edges = this.graph.getEdgesForNode(startNode);
      return edges.every((e) => e.weight === 1);
    })) {
      optimizedStrategy = 'BFS';
    }
    const cacheKey = computeHash(
      JSON.stringify({ startNode, strategy: optimizedStrategy, options: options ?? {} }),
    );
    const estimatedCost = neighbors.length * (optimizedStrategy === 'BFS' ? 1 : 2);
    return { strategy: optimizedStrategy, cacheKey, estimatedCost };
  }

  public shouldCache(strategy: TraversalStrategy, depth: number): boolean {
    return depth > 2 || strategy === 'WEIGHTED' || strategy === 'SEMANTIC';
  }

  public getCachedResult(key: string): unknown {
    const entry = this.cache.get(key);
    return entry?.result;
  }

  public setCachedResult(key: string, result: unknown): void {
    this.cache.set(key, { key, result: result as TraversalCacheEntry['result'] });
  }
}
