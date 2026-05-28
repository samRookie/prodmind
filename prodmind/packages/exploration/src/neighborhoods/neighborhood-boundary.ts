import type { NodeId, GraphEdge } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class NeighborhoodBoundary {
  public findBoundaryNodes(neighborhood: NodeId[], graph: GraphContract): NodeId[] {
    const neighborhoodSet = new Set(neighborhood);

    return neighborhood.filter((nodeId) => {
      const edges = graph.getEdgesForNode(nodeId);
      return edges.some((e) => {
        const neighbor = e.source === nodeId ? e.target : e.source;
        return !neighborhoodSet.has(neighbor);
      });
    });
  }

  public findBoundaryEdges(neighborhood: NodeId[], graph: GraphContract): GraphEdge[] {
    const neighborhoodSet = new Set(neighborhood);
    const boundaryEdges: GraphEdge[] = [];

    for (const nodeId of neighborhood) {
      const edges = graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (!neighborhoodSet.has(neighbor)) {
          const edgeId = edge.id;
          if (!boundaryEdges.some((be) => be.id === edgeId)) {
            boundaryEdges.push(edge);
          }
        }
      }
    }

    return boundaryEdges;
  }

  public findBridgeNodes(
    neighborhoodA: NodeId[],
    neighborhoodB: NodeId[],
    graph: GraphContract,
  ): NodeId[] {
    const setB = new Set(neighborhoodB);
    const bridges: NodeId[] = [];

    for (const nodeId of neighborhoodA) {
      const edges = graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (setB.has(neighbor) && !bridges.includes(nodeId)) {
          bridges.push(nodeId);
        }
      }
    }

    return bridges;
  }

  public computeBoundaryDensity(neighborhood: NodeId[], graph: GraphContract): number {
    if (neighborhood.length === 0) return 0;

    const neighborhoodSet = new Set(neighborhood);
    let internalEdges = 0;
    let boundaryEdges = 0;

    for (const nodeId of neighborhood) {
      const edges = graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        const neighbor = edge.source === nodeId ? edge.target : edge.source;
        if (neighborhoodSet.has(neighbor)) {
          internalEdges++;
        } else {
          boundaryEdges++;
        }
      }
    }

    const total = internalEdges + boundaryEdges;
    if (total === 0) return 0;

    const boundaryRatio = boundaryEdges / total;
    const maxPossibleInternal = (neighborhood.length * (neighborhood.length - 1)) / 2;
    const internalDensity = maxPossibleInternal > 0 ? internalEdges / maxPossibleInternal : 0;

    return Math.round((boundaryRatio * 0.4 + internalDensity * 0.6) * 100) / 100;
  }
}
