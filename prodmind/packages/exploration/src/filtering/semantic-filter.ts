import type { GraphNode } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class SemanticFilter {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public bySemanticType(nodes: GraphNode[], ...types: string[]): GraphNode[] {
    const typeSet = new Set(types);
    return nodes.filter((n) => {
      const nodeType = n.properties['semanticType'] as string | undefined;
      return nodeType !== undefined && typeSet.has(nodeType);
    });
  }

  public byBoundary(nodes: GraphNode[], boundaryType: string): GraphNode[] {
    return nodes.filter((n) => {
      const edges = this.graph.getEdgesForNode(n.id);
      const boundary = n.properties['boundaryType'] as string | undefined;
      if (boundary === boundaryType) return true;

      return edges.some((e) => {
        const sourceNode = this.graph.getNode(e.source);
        const targetNode = this.graph.getNode(e.target);
        if (!sourceNode || !targetNode) return false;
        return (
          (sourceNode.properties['boundaryType'] as string | undefined) === boundaryType ||
          (targetNode.properties['boundaryType'] as string | undefined) === boundaryType
        );
      });
    });
  }

  public byCluster(nodes: GraphNode[], clusterId: string): GraphNode[] {
    return nodes.filter((n) => {
      const nodeCluster = n.properties['clusterId'] as string | undefined;
      if (nodeCluster === clusterId) return true;

      const edges = this.graph.getEdgesForNode(n.id);
      return edges.some((e) => {
        const neighbor =
          e.source === n.id ? this.graph.getNode(e.target) : this.graph.getNode(e.source);
        if (!neighbor) return false;
        return (neighbor.properties['clusterId'] as string | undefined) === clusterId;
      });
    });
  }
}
