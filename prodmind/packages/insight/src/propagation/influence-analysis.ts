import type { PropagationIntelligence } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface InfluenceNode {
  nodeId: string;
  influence: number;
}

export function computeInfluenceScores(
  adjacencyList: Map<string, string[]>,
  damping = 0.85,
  iterations = 20,
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const node of adjacencyList.keys()) scores.set(node, 1);
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = new Map<string, number>();
    let danglingSum = 0;
    for (const [node, score] of scores) {
      const neighbors = adjacencyList.get(node) ?? [];
      if (neighbors.length > 0) {
        const share = score / neighbors.length;
        for (const neighbor of neighbors) {
          newScores.set(neighbor, (newScores.get(neighbor) ?? 0) + share);
        }
      } else {
        danglingSum += score;
      }
    }
    const N = scores.size;
    for (const node of scores.keys()) {
      const s = newScores.get(node) ?? 0;
      const val = (1 - damping) / N + damping * (s + danglingSum / N);
      scores.set(node, val);
    }
  }
  return scores;
}

export function rankByInfluence(
  scores: Map<string, number>,
  topN = 10,
): InfluenceNode[] {
  return Array.from(scores.entries())
    .map(([nodeId, influence]) => ({ nodeId, influence }))
    .sort((a, b) => b.influence - a.influence)
    .slice(0, topN);
}

export function assessTransitiveRisk(
  nodeId: string,
  transitivePath: string[],
  pathLength: number,
): PropagationIntelligence {
  return {
    id: generateId('transitive-risk'),
    propagationType: 'transitive-risk',
    sourceNodeId: nodeId,
    blastRadius: transitivePath.length,
    cascadeRisk: Math.min(pathLength / 10, 1),
    influenceScore: Math.min(transitivePath.length / 20, 1),
    affectedNodes: transitivePath,
    chainDepth: pathLength,
  };
}
