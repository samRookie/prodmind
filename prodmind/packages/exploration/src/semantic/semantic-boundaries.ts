import type { NodeId, SemanticBoundary, GraphEdge } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class SemanticBoundaryDetector {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public detectBoundaries(nodeId: NodeId): SemanticBoundary[] {
    const node = this.graph.getNode(nodeId);
    if (!node) return [];

    const edges = this.graph.getEdgesForNode(nodeId);
    const boundaries = new Map<string, SemanticBoundary>();

    for (const edge of edges) {
      const otherId = edge.source === nodeId ? edge.target : edge.source;
      const otherNode = this.graph.getNode(otherId);
      if (!otherNode || otherNode.type === node.type) continue;

      const direction = edge.source === nodeId ? 'OUTGOING' : 'INCOMING';
      const existing = boundaries.get(otherNode.type);
      if (existing) {
        existing.crossBoundaryEdges.push(edge.id);
        if (existing.direction !== direction) {
          existing.direction = 'BIDIRECTIONAL';
        }
      } else {
        boundaries.set(otherNode.type, {
          nodeId,
          boundaryType: otherNode.type,
          direction: direction as 'INCOMING' | 'OUTGOING' | 'BIDIRECTIONAL',
          crossBoundaryEdges: [edge.id],
        });
      }
    }

    return Array.from(boundaries.values());
  }

  public findCrossBoundaryConnections(nodeId: NodeId): GraphEdge[] {
    const node = this.graph.getNode(nodeId);
    if (!node) return [];

    const edges = this.graph.getEdgesForNode(nodeId);
    return edges.filter((edge) => {
      const otherId = edge.source === nodeId ? edge.target : edge.source;
      const otherNode = this.graph.getNode(otherId);
      return otherNode !== undefined && otherNode.type !== node.type;
    });
  }
}
