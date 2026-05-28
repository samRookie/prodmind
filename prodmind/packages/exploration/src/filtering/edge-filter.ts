import type { GraphEdge, FilterOperator } from '../types/index.ts';

export class EdgeFilter {
  public byType(edges: GraphEdge[], edgeType: string): GraphEdge[] {
    return edges.filter((e) => e.type === edgeType);
  }

  public byProperty(edges: GraphEdge[], property: string, operator: FilterOperator, value: unknown): GraphEdge[] {
    return edges.filter((e) => {
      const prop = property === 'weight' ? e.weight : e.properties[property];
      return this.applyOperator(prop, operator, value);
    });
  }

  public byWeight(edges: GraphEdge[], min: number, max: number): GraphEdge[] {
    return edges.filter((e) => e.weight >= min && e.weight <= max);
  }

  public bySource(edges: GraphEdge[], sourceId: string): GraphEdge[] {
    return edges.filter((e) => e.source === sourceId);
  }

  public byTarget(edges: GraphEdge[], targetId: string): GraphEdge[] {
    return edges.filter((e) => e.target === targetId);
  }

  public byCustom(edges: GraphEdge[], predicate: (edge: GraphEdge) => boolean): GraphEdge[] {
    return edges.filter(predicate);
  }

  private applyOperator(prop: unknown, operator: FilterOperator, value: unknown): boolean {
    switch (operator) {
      case 'EQUALS':
        return prop === value;
      case 'NOT_EQUALS':
        return prop !== value;
      case 'GREATER_THAN':
        return typeof prop === 'number' && typeof value === 'number' && prop > value;
      case 'LESS_THAN':
        return typeof prop === 'number' && typeof value === 'number' && prop < value;
      case 'IN_RANGE':
        if (Array.isArray(value) && value.length === 2) {
          return typeof prop === 'number' && prop >= (value[0] as number) && prop <= (value[1] as number);
        }
        return false;
      case 'CONTAINS':
        if (typeof prop === 'string' && typeof value === 'string') {
          return prop.includes(value);
        }
        if (Array.isArray(prop)) {
          return prop.includes(value);
        }
        return false;
      case 'MATCHES_REGEX':
        if (typeof prop === 'string' && typeof value === 'string') {
          try {
            return new RegExp(value).test(prop);
          } catch {
            return false;
          }
        }
        return false;
      case 'EXISTS':
        return prop !== undefined && prop !== null;
      case 'NOT_EXISTS':
        return prop === undefined || prop === null;
      default:
        return false;
    }
  }
}
