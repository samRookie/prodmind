import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class TransitiveDependencyAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findAllTransitive(nodeId: NodeId, maxDepth: number = 100): NodeId[] {
    const result = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    result.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (!result.has(edge.target)) {
          result.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return Array.from(result).filter((id) => id !== nodeId);
  }

  public countTransitive(nodeId: NodeId, maxDepth: number = 100): number {
    return this.findAllTransitive(nodeId, maxDepth).length;
  }

  public findSharedTransitive(nodes: NodeId[]): NodeId[] {
    if (nodes.length === 0) return [];

    const transitiveSets = nodes.map((nodeId) => {
      const deps = this.findAllTransitive(nodeId);
      return new Set(deps);
    });

    const shared: NodeId[] = [];
    const firstSet = transitiveSets[0]!;
    for (const dep of firstSet) {
      if (transitiveSets.every((s) => s.has(dep))) {
        shared.push(dep);
      }
    }
    return shared;
  }

  public findTransitiveByType(nodeId: NodeId, edgeType: string): NodeId[] {
    const result = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId }> = [{ nodeId }];
    result.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current } = queue.shift()!;
      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (edge.type !== edgeType) continue;
        if (!result.has(edge.target)) {
          result.add(edge.target);
          queue.push({ nodeId: edge.target });
        }
      }
    }

    return Array.from(result).filter((id) => id !== nodeId);
  }
}
