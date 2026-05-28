import type { FilterOperator } from '../types/index.ts';
import type { FilterConfig } from './graph-filter-engine.ts';

export class FilterQuery {
  public static parse(filterString: string): FilterConfig[] {
    const filters: FilterConfig[] = [];

    if (!filterString || filterString.trim().length === 0) return filters;

    const parts = filterString.split(';').map((s) => s.trim());

    for (const part of parts) {
      if (part.length === 0) continue;

      const filter = FilterQuery.parseSingle(part);
      if (filter) filters.push(filter);
    }

    return filters;
  }

  public static serialize(filters: FilterConfig[]): string {
    return filters
      .map((f) => {
        let result = `${f.type}`;
        if (f.field !== undefined) result += `.${f.field}`;
        if (f.operator !== undefined) result += ` ${f.operator}`;
        if (f.value !== undefined) {
          const serialized = typeof f.value === 'string' ? `"${f.value}"` : JSON.stringify(f.value);
          result += ` ${serialized}`;
        }
        return result;
      })
      .join('; ');
  }

  public static validate(filters: FilterConfig[]): boolean {
    return filters.every((f) => {
      if (!f.type) return false;
      if (!['NODE', 'EDGE', 'SEMANTIC', 'METRIC', 'STRUCTURAL'].includes(f.type)) return false;

      if (f.operator !== undefined && !FilterQuery.isValidOperator(f.operator)) return false;

      if (f.filter !== undefined && typeof f.filter !== 'function') return false;

      return true;
    });
  }

  private static parseSingle(input: string): FilterConfig | null {
    const typeMatch = input.match(/^(NODE|EDGE|SEMANTIC|METRIC|STRUCTURAL)/);
    if (!typeMatch) return null;

    const type = typeMatch[1] as FilterConfig['type'];
    let remainder = input.slice(typeMatch[0].length).trim();

    let field: string | undefined;
    const fieldMatch = remainder.match(/^\.(\w+)/);
    if (fieldMatch) {
      field = fieldMatch[1];
      remainder = remainder.slice(fieldMatch[0].length).trim();
    }

    let operator: string | undefined;
    let value: unknown | undefined;

    const opMatch = remainder.match(/^(EQUALS|NOT_EQUALS|GREATER_THAN|LESS_THAN|IN_RANGE|CONTAINS|MATCHES_REGEX|EXISTS|NOT_EXISTS)/);
    if (opMatch) {
      operator = opMatch[1];
      remainder = remainder.slice(opMatch[0].length).trim();
    }

    if (remainder.length > 0) {
      try {
        value = JSON.parse(remainder);
      } catch {
        if (remainder.startsWith('"') && remainder.endsWith('"')) {
          value = remainder.slice(1, -1);
        } else {
          value = remainder;
        }
      }
    }

    return { type, field, operator, value };
  }

  private static isValidOperator(op: string): boolean {
    const validOps: FilterOperator[] = [
      'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
      'IN_RANGE', 'CONTAINS', 'MATCHES_REGEX', 'EXISTS', 'NOT_EXISTS',
    ];
    return validOps.includes(op as FilterOperator);
  }
}
