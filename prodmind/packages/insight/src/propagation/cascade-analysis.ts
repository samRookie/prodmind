import type { PropagationIntelligence } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function simulateCascade(
  sourceNode: string,
  adjacencyList: Map<string, string[]>,
  failureProbability: number,
  maxDepth = 5,
): { cascadeChain: string[]; probability: number } {
  const affected: string[] = [];
  const visited = new Set<string>([sourceNode]);
  const queue: Array<{ node: string; depth: number }> = [{ node: sourceNode, depth: 0 }];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    const neighbors = adjacencyList.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && Math.random() < failureProbability) {
        visited.add(neighbor);
        affected.push(neighbor);
        queue.push({ node: neighbor, depth: depth + 1 });
      }
    }
  }
  const aggregateProb = Math.pow(failureProbability, Math.min(affected.length + 1, 5));
  return { cascadeChain: [sourceNode, ...affected], probability: aggregateProb };
}

export function analyzeCascade(
  rootNode: string,
  cascadeChain: string[],
  probability: number,
): PropagationIntelligence {
  return {
    id: generateId('cascade-analysis'),
    propagationType: 'cascade',
    sourceNodeId: rootNode,
    blastRadius: cascadeChain.length,
    cascadeRisk: probability,
    influenceScore: probability * cascadeChain.length / 10,
    affectedNodes: cascadeChain,
    chainDepth: cascadeChain.length,
  };
}
