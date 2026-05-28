import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class DependencyDepthAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public analyzeDepthDistribution(nodeId: NodeId): Map<number, number> {
    const distribution = new Map<number, number>();
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) {
        distribution.set(depth, (distribution.get(depth) ?? 0) + 1);
      }

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return distribution;
  }

  public findDeepestDependencies(nodeId: NodeId, topK: number): Array<{ nodeId: NodeId; depth: number }> {
    const depths: Array<{ nodeId: NodeId; depth: number }> = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) {
        depths.push({ nodeId: current, depth });
      }

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    depths.sort((a, b) => b.depth - a.depth);
    return depths.slice(0, topK);
  }

  public computeAverageDepth(nodeId: NodeId): number {
    const depths: number[] = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) depths.push(depth);

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return depths.length > 0
      ? depths.reduce((sum, d) => sum + d, 0) / depths.length
      : 0;
  }
}
