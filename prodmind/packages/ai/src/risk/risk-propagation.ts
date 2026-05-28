import type { RiskCorrelation } from './risk-types.ts';

const MAX_TRAVERSAL_DEPTH = 10;

export interface PropagationResult {
  sourceNodes: string[];
  reachableNodes: string[];
  maxDepth: number;
  nodeCount: number;
}

export function computeBoundedPropagation(
  adjacencyMap: Map<string, string[]>,
  sourceNodes: string[],
  maxDepth: number = MAX_TRAVERSAL_DEPTH,
): PropagationResult {
  const visited = new Set<string>(sourceNodes);
  const queue: { node: string; depth: number }[] = sourceNodes.map(n => ({ node: n, depth: 0 }));
  let maxReachedDepth = 0;

  let i = 0;
  while (i < queue.length) {
    const { node, depth } = queue[i]!;
    i++;
    if (depth >= maxDepth) continue;

    const neighbors = adjacencyMap.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
        if (depth + 1 > maxReachedDepth) maxReachedDepth = depth + 1;
      }
    }
  }

  return {
    sourceNodes,
    reachableNodes: [...visited],
    maxDepth: maxReachedDepth,
    nodeCount: visited.size,
  };
}

export function computeAggregatePropagation(
  correlations: RiskCorrelation[],
  adjacencyMap: Map<string, string[]>,
): Map<string, PropagationResult> {
  const results = new Map<string, PropagationResult>();
  for (const correlation of correlations) {
    if (correlation.impactedNodes.length > 0) {
      const result = computeBoundedPropagation(adjacencyMap, correlation.impactedNodes);
      results.set(correlation.fingerprint, result);
    }
  }
  return results;
}
