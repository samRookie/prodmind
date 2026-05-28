import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';

export class SemanticLinkage {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public findLinkedNodes(nodeId: NodeId, linkType: string, maxDepth: number = 100): NodeId[] {
    const linked: NodeId[] = [];
    const visited = new Set<NodeId>();
    const queue: Array<{ nodeId: NodeId; depth: number }> = [{ nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const { nodeId: current, depth } = queue.shift()!;
      if (depth > 0) linked.push(current);
      if (depth >= maxDepth) continue;

      const edges = this.graph.getOutgoingEdges(current);
      for (const edge of edges) {
        if (edge.type !== linkType) continue;
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return linked;
  }

  public findIndirectDependencies(nodeId: NodeId, depth: number): NodeId[] {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(nodeId, { maxDepth: depth, direction: 'FORWARD' });
    return Array.from(result.visited).filter((id) => id !== nodeId);
  }

  public findSharedDependencies(nodes: NodeId[]): NodeId[] {
    if (nodes.length === 0) return [];

    const depSets = nodes.map((nodeId) => {
      const edges = this.graph.getOutgoingEdges(nodeId);
      return new Set(edges.map((e) => e.target));
    });

    const shared: NodeId[] = [];
    const firstSet = depSets[0]!;
    for (const dep of firstSet) {
      if (depSets.every((s) => s.has(dep))) {
        shared.push(dep);
      }
    }
    return shared;
  }
}
