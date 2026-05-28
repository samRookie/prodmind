import type { GraphNode, FilterOperator } from '../types/index.ts';

export class NodeFilter {
  public byType(nodes: GraphNode[], nodeType: string): GraphNode[] {
    return nodes.filter((n) => n.type === nodeType);
  }

  public byProperty(nodes: GraphNode[], property: string, operator: FilterOperator, value: unknown): GraphNode[] {
    return nodes.filter((n) => {
      const prop = n.properties[property];
      return this.applyOperator(prop, operator, value);
    });
  }

  public byCustom(nodes: GraphNode[], predicate: (node: GraphNode) => boolean): GraphNode[] {
    return nodes.filter(predicate);
  }

  public byIds(nodes: GraphNode[], ids: string[]): GraphNode[] {
    const idSet = new Set(ids);
    return nodes.filter((n) => idSet.has(n.id));
  }

  public byMultiple(
    nodes: GraphNode[],
    filters: Array<{ field: string; operator: FilterOperator; value: unknown }>,
  ): GraphNode[] {
    return nodes.filter((n) =>
      filters.every((f) => {
        const prop = f.field === 'type' ? n.type : n.properties[f.field];
        return this.applyOperator(prop, f.operator, f.value);
      }),
    );
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
