import type { TraversalCacheEntry, NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalCache } from '../traversal/traversal-cache.ts';

export class CachePlanner {
  private cache: TraversalCache;

  constructor(cache: TraversalCache) {
    this.cache = cache;
  }

  public planPreheating(graph: GraphContract): Array<{ key: string; startNode: NodeId }> {
    const preheatPlan: Array<{ key: string; startNode: NodeId }> = [];
    const nodes = graph.getAllNodes();
    const highDegreeNodes = nodes
      .map((n) => ({ node: n, degree: graph.getEdgesForNode(n.id).length }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);
    for (const { node } of highDegreeNodes) {
      preheatPlan.push({ key: `bfs:${node.id}`, startNode: node.id });
      preheatPlan.push({ key: `dfs:${node.id}`, startNode: node.id });
    }
    return preheatPlan;
  }

  public shouldEvict(entry: TraversalCacheEntry): boolean {
    const age = Date.now() - new Date(entry.timestamp).getTime();
    const ONE_HOUR = 3600000;
    return age > ONE_HOUR && entry.hits < 2;
  }

  public estimateCacheSavings(queryPatterns: string[]): number {
    if (queryPatterns.length === 0) return 0;
    let potentialSavings = 0;
    for (const pattern of queryPatterns) {
      const stats = this.cache.stats();
      const matchingEntries = stats.entries.filter((e) => e.key.includes(pattern));
      for (const entry of matchingEntries) {
        potentialSavings += entry.hits * 10;
      }
    }
    return potentialSavings;
  }
}
