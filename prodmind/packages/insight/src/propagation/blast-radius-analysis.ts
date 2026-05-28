import type { PropagationIntelligence } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function computeBlastRadius(
  sourceNode: string,
  adjacencyList: Map<string, string[]>,
  maxDepth = 5,
): { affectedNodes: string[]; depth: number } {
  const visited = new Set<string>([sourceNode]);
  const queue: Array<{ node: string; depth: number }> = [{ node: sourceNode, depth: 0 }];
  const affected: string[] = [];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    const neighbors = adjacencyList.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        affected.push(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }
  return { affectedNodes: affected, depth: maxDepth };
}

export function estimateBlastRadius(
  nodeId: string,
  transitiveDependents: string[],
): PropagationIntelligence {
  const count = transitiveDependents.length;
  return {
    id: generateId('blast-radius'),
    propagationType: 'blast-radius',
    sourceNodeId: nodeId,
    blastRadius: count,
    cascadeRisk: Math.min(count / 30, 1),
    influenceScore: Math.min(count / 20, 1),
    affectedNodes: transitiveDependents,
    chainDepth: Math.min(count, 10),
  };
}
