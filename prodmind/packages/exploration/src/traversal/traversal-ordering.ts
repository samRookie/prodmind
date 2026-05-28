import type { GraphEdge, NodeId } from '../types/index.ts';

export type OrderingStrategy = 'ALPHABETICAL' | 'INSERTION' | 'WEIGHTED_ASC' | 'WEIGHTED_DESC' | 'TYPE_GROUPED';

export class TraversalOrdering {
  public static orderNodes(nodes: NodeId[], strategy: OrderingStrategy): NodeId[] {
    switch (strategy) {
      case 'ALPHABETICAL':
        return TraversalOrdering.alphabetically(nodes);
      case 'INSERTION':
        return [...nodes];
      case 'TYPE_GROUPED':
        return [...nodes].sort();
      case 'WEIGHTED_ASC':
      case 'WEIGHTED_DESC':
        return [...nodes];
      default:
        return [...nodes];
    }
  }

  public static orderEdges(edges: GraphEdge[], strategy: OrderingStrategy): GraphEdge[] {
    switch (strategy) {
      case 'ALPHABETICAL':
        return [...edges].sort((a, b) => a.id.localeCompare(b.id));
      case 'INSERTION':
        return [...edges];
      case 'WEIGHTED_ASC':
        return TraversalOrdering.byWeight(edges, true);
      case 'WEIGHTED_DESC':
        return TraversalOrdering.byWeight(edges, false);
      case 'TYPE_GROUPED':
        return [...edges].sort((a, b) => {
          if (a.type < b.type) return -1;
          if (a.type > b.type) return 1;
          return a.id.localeCompare(b.id);
        });
      default:
        return [...edges];
    }
  }

  public static alphabetically(nodes: NodeId[]): NodeId[] {
    return [...nodes].sort((a, b) => a.localeCompare(b));
  }

  public static byWeight(edges: GraphEdge[], ascending: boolean = true): GraphEdge[] {
    return [...edges].sort((a, b) => {
      const cmp = a.weight - b.weight;
      return ascending ? cmp : -cmp;
    });
  }

  public static byType(nodes: NodeId[], getNodeType: (id: NodeId) => string): NodeId[] {
    return [...nodes].sort((a, b) => {
      const typeA = getNodeType(a);
      const typeB = getNodeType(b);
      if (typeA < typeB) return -1;
      if (typeA > typeB) return 1;
      return a.localeCompare(b);
    });
  }

  public order(steps: string[]): { steps: string[] } {
    return { steps: TraversalOrdering.orderNodes(steps, 'INSERTION') };
  }
}
