import type { GraphNode, NodeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class StructuralFilter {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public byDegree(nodes: GraphNode[], minDegree: number, maxDegree?: number): GraphNode[] {
    return nodes.filter((n) => {
      const edges = this.graph.getEdgesForNode(n.id);
      return maxDegree !== undefined
        ? edges.length >= minDegree && edges.length <= maxDegree
        : edges.length >= minDegree;
    });
  }

  public byFanOut(nodes: GraphNode[], min: number, max?: number): GraphNode[] {
    return nodes.filter((n) => {
      const outgoing = this.graph.getOutgoingEdges(n.id).length;
      return max !== undefined
        ? outgoing >= min && outgoing <= max
        : outgoing >= min;
    });
  }

  public byFanIn(nodes: GraphNode[], min: number, max?: number): GraphNode[] {
    return nodes.filter((n) => {
      const incoming = this.graph.getIncomingEdges(n.id).length;
      return max !== undefined
        ? incoming >= min && incoming <= max
        : incoming >= min;
    });
  }

  public byConnectivity(nodes: GraphNode[], minConnections: number): GraphNode[] {
    return nodes.filter((n) => {
      const edges = this.graph.getEdgesForNode(n.id);
      return edges.length >= minConnections;
    });
  }

  public byIsland(nodes: GraphNode[]): GraphNode[] {
    const visited = new Set<NodeId>();
    const adjList = new Map<NodeId, NodeId[]>();

    for (const node of nodes) {
      adjList.set(node.id, []);
    }

    for (const node of nodes) {
      const edges = this.graph.getEdgesForNode(node.id);
      for (const edge of edges) {
        const neighbor = edge.source === node.id ? edge.target : edge.source;
        if (adjList.has(neighbor)) {
          adjList.get(node.id)!.push(neighbor);
        }
      }
    }

    const islands: GraphNode[][] = [];

    for (const node of nodes) {
      if (visited.has(node.id)) continue;

      const component: GraphNode[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const nodeObj = nodes.find((n) => n.id === current);
        if (nodeObj) component.push(nodeObj);

        const neighbors = adjList.get(current) ?? [];
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      islands.push(component);
    }

    const largestSize = Math.max(...islands.map((i) => i.length), 0);
    return islands.filter((i) => i.length < largestSize).flat();
  }
}
