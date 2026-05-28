import type { ParsedQuery, QueryContext, QueryResult, QueryFilter, QuerySort } from './query-types.ts';
import { fingerprintQuery } from './query-fingerprint.ts';
import { normalizeQuery } from './query-normalizer.ts';

export class QueryExecutor {
  execute<T extends Record<string, unknown>>(query: ParsedQuery, context: QueryContext): QueryResult<T> {
    const startTime = Date.now();
    const normalized = normalizeQuery(query);
    const fp = fingerprintQuery(normalized);

    const candidates = this.selectDataSource<T>(normalized, context);
    const filtered = this.applyFilters(candidates, normalized.filters);
    const scoped = this.applyScope(filtered, normalized.scope);
    const sorted = this.applySorts(scoped, normalized.sorts);
    const sliced = sorted.slice(normalized.offset, normalized.offset + normalized.limit);

    return {
      queryType: normalized.queryType,
      fingerprint: fp,
      data: sliced as T[],
      total: filtered.length,
      offset: normalized.offset,
      limit: normalized.limit,
      executionTimeMs: Date.now() - startTime,
    };
  }

  private selectDataSource<T>(query: ParsedQuery, context: QueryContext): T[] {
    switch (query.queryType) {
      case 'NODE_QUERY': return (context.nodes ?? []) as T[];
      case 'EDGE_QUERY': return (context.edges ?? []) as T[];
      case 'SCC_QUERY': return (context.sccs ?? []) as T[];
      case 'HOTSPOT_QUERY': return (context.hotspots ?? []) as T[];
      case 'RISK_QUERY': return (context.risks ?? []) as T[];
      case 'PATTERN_QUERY': return (context.patterns ?? []) as T[];
      case 'RECOMMENDATION_QUERY': return (context.recommendations ?? []) as T[];
      case 'PROPAGATION_QUERY': return (context.risks ?? []) as T[];
      case 'TREND_QUERY': return (context.trends ?? []) as T[];
      case 'COGNITION_QUERY': return (context.cognitions ?? context.narratives ?? []) as T[];
      case 'HISTORY_QUERY': return (context.historicalSnapshots ?? []) as T[];
      case 'DIFF_QUERY': return [] as T[];
      default: return [] as T[];
    }
  }

  private applyFilters<T extends Record<string, unknown>>(data: T[], filters: QueryFilter[]): T[] {
    if (filters.length === 0) return data;
    return data.filter(item => {
      return filters.every(f => this.matchesFilter(item, f));
    });
  }

  private matchesFilter(item: Record<string, unknown>, filter: QueryFilter): boolean {
    const value = item[filter.field];
    switch (filter.comparator) {
      case 'EQ': return value === filter.value;
      case 'NEQ': return value !== filter.value;
      case 'GT': return typeof value === 'number' && typeof filter.value === 'number' && value > filter.value;
      case 'GTE': return typeof value === 'number' && typeof filter.value === 'number' && value >= filter.value;
      case 'LT': return typeof value === 'number' && typeof filter.value === 'number' && value < filter.value;
      case 'LTE': return typeof value === 'number' && typeof filter.value === 'number' && value <= filter.value;
      case 'IN': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'NOT_IN': return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'CONTAINS': return typeof value === 'string' && typeof filter.value === 'string' && value.includes(filter.value);
      case 'STARTS_WITH': return typeof value === 'string' && typeof filter.value === 'string' && value.startsWith(filter.value);
      default: return true;
    }
  }

  private applyScope<T extends Record<string, unknown>>(data: T[], scope: { namespaces?: string[]; subsystems?: string[]; severities?: string[] }): T[] {
    let result = data;
    if (scope.namespaces && scope.namespaces.length > 0) {
      const ns = new Set(scope.namespaces);
      result = result.filter(item => {
        const val = item['namespace'] ?? item['subsystem'];
        return ns.has(val as string);
      });
    }
    if (scope.subsystems && scope.subsystems.length > 0) {
      const ss = new Set(scope.subsystems);
      result = result.filter(item => ss.has(item['subsystem'] as string));
    }
    if (scope.severities && scope.severities.length > 0) {
      const sv = new Set(scope.severities);
      result = result.filter(item => sv.has(item['severity'] as string));
    }
    return result;
  }

  private applySorts<T extends Record<string, unknown>>(data: T[], sorts: QuerySort[]): T[] {
    if (sorts.length === 0) return data;
    return [...data].sort((a, b) => {
      for (const sort of sorts) {
        const va = a[sort.field];
        const vb = b[sort.field];
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else if (typeof va === 'string' && typeof vb === 'string') {
          cmp = va.localeCompare(vb);
        } else {
          cmp = String(va).localeCompare(String(vb));
        }
        if (cmp !== 0) return sort.order === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }
}
