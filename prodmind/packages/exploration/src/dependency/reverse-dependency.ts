import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class ReverseDependencyAnalyzer {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findReverseDependencies(nodeId: NodeId, maxDepth: number = 100): NodeId[] {
    const result = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    result.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const edges = this.graph.getIncomingEdges(current);
      for (const edge of edges) {
        if (!result.has(edge.source)) {
          result.add(edge.source);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      }
    }

    return Array.from(result).filter((id) => id !== nodeId);
  }

  public countReverseDependencies(nodeId: NodeId): number {
    return this.findReverseDependencies(nodeId).length;
  }

  public findCriticalDependents(nodeId: NodeId, threshold: number): NodeId[] {
    const dependents = this.findReverseDependencies(nodeId);
    return dependents.filter((id) => {
      const outgoingCount = this.graph.getOutgoingEdges(id).length;
      return outgoingCount >= threshold;
    });
  }

  public findLeafDependents(nodeId: NodeId): NodeId[] {
    const dependents = this.findReverseDependencies(nodeId);
    return dependents.filter((id) => {
      const outgoingEdges = this.graph.getOutgoingEdges(id);
      return outgoingEdges.length === 0;
    });
  }
}
