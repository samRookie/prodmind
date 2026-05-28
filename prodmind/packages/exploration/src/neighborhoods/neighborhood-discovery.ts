import type { NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class NeighborhoodDiscovery {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public discoverByRadius(
    nodeId: NodeId,
    radius: number,
    options?: { direction?: string; nodeTypes?: string[]; edgeTypes?: string[] },
  ): NodeId[] {
    const direction = options?.direction ?? 'BIDIRECTIONAL';
    const nodeTypes = options?.nodeTypes;
    const edgeTypes = options?.edgeTypes ? new Set(options.edgeTypes) : undefined;

    const visited = new Set<NodeId>();
    const queue: Array<{ id: NodeId; depth: number }> = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= radius) continue;

      const edges = this.getEdges(current.id, direction);
      for (const edge of edges) {
        if (edgeTypes && !edgeTypes.has(edge.type)) continue;

        const neighborId = edge.source === current.id ? edge.target : edge.source;
        if (visited.has(neighborId)) continue;

        const neighborNode = this.graph.getNode(neighborId);
        if (!neighborNode) continue;
        if (nodeTypes && !nodeTypes.includes(neighborNode.type)) continue;

        visited.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    }

    return Array.from(visited);
  }

  public discoverBySemantic(nodeId: NodeId, semanticType: string, maxDistance: number): NodeId[] {
    const visited = new Set<NodeId>();
    const result = new Set<NodeId>();
    const queue: Array<{ id: NodeId; depth: number }> = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > maxDistance) continue;

      const node = this.graph.getNode(current.id);
      if (node && (node.properties['semanticType'] as string | undefined) === semanticType) {
        result.add(current.id);
      }

      if (current.depth >= maxDistance) continue;

      for (const edge of this.graph.getEdgesForNode(current.id)) {
        const neighborId = edge.source === current.id ? edge.target : edge.source;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, depth: current.depth + 1 });
        }
      }
    }

    return Array.from(result);
  }

  public discoverByDependency(nodeId: NodeId, maxDepth: number): NodeId[] {
    const visited = new Set<NodeId>();
    const queue: Array<{ id: NodeId; depth: number }> = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const incoming = this.graph.getIncomingEdges(current.id);
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push({ id: edge.source, depth: current.depth + 1 });
        }
      }

      const outgoing = this.graph.getOutgoingEdges(current.id);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ id: edge.target, depth: current.depth + 1 });
        }
      }
    }

    return Array.from(visited);
  }

  public discoverSharedNeighborhood(nodes: NodeId[], radius: number): NodeId[] {
    const neighborhoods = nodes.map((n) => {
      const visited = new Set<NodeId>();
      const queue: Array<{ id: NodeId; depth: number }> = [{ id: n, depth: 0 }];
      visited.add(n);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth >= radius) continue;

        for (const edge of this.graph.getEdgesForNode(current.id)) {
          const neighborId = edge.source === current.id ? edge.target : edge.source;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ id: neighborId, depth: current.depth + 1 });
          }
        }
      }

      return visited;
    });

    if (neighborhoods.length === 0) return [];

    const first = neighborhoods[0]!;
    const shared = new Set<NodeId>();
    for (const nodeId of first) {
      if (neighborhoods.every((n) => n!.has(nodeId))) {
        shared.add(nodeId);
      }
    }

    return Array.from(shared);
  }

  private getEdges(nodeId: NodeId, direction: string): ReturnType<GraphContract['getEdgesForNode']> {
    switch (direction) {
      case 'FORWARD':
        return this.graph.getOutgoingEdges(nodeId);
      case 'REVERSE':
        return this.graph.getIncomingEdges(nodeId);
      case 'BIDIRECTIONAL':
      default:
        return this.graph.getEdgesForNode(nodeId);
    }
  }
}
