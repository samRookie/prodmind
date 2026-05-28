import type { GraphNode, GraphEdge } from '../types/index.ts';

export class SemanticQuery {
  public static findNodesByType(nodes: GraphNode[], nodeType: string): GraphNode[] {
    return nodes.filter((node) => node.type === nodeType);
  }

  public static findNodesByProperty(nodes: GraphNode[], property: string, value: unknown): GraphNode[] {
    return nodes.filter((node) => node.properties[property] === value);
  }

  public static findEdgesByType(edges: GraphEdge[], edgeType: string): GraphEdge[] {
    return edges.filter((edge) => edge.type === edgeType);
  }

  public static findEdgesByProperty(edges: GraphEdge[], property: string, value: unknown): GraphEdge[] {
    return edges.filter((edge) => edge.properties[property] === value);
  }
}
