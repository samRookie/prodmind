import type { ParsedQuery, QueryFilter, QueryScope, QuerySort, QueryType } from './query-types.ts';

export interface RawQuery {
  type: string;
  filters?: { field: string; comparator: string; value: unknown }[];
  sorts?: { field: string; order?: string }[];
  scope?: { namespaces?: string[]; subsystems?: string[]; severities?: string[] };
  limit?: number;
  offset?: number;
  historicalRange?: { start: string; end: string };
  snapshotId?: string;
}

const VALID_QUERY_TYPES = new Set([
  'NODE_QUERY', 'EDGE_QUERY', 'SCC_QUERY', 'HOTSPOT_QUERY',
  'RISK_QUERY', 'PATTERN_QUERY', 'RECOMMENDATION_QUERY',
  'PROPAGATION_QUERY', 'TREND_QUERY', 'DIFF_QUERY',
  'COGNITION_QUERY', 'HISTORY_QUERY',
]);

const VALID_COMPARATORS = new Set(['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NOT_IN', 'CONTAINS', 'STARTS_WITH']);

export function parseQuery(raw: RawQuery): ParsedQuery {
  if (!raw || !raw.type) {
    return createEmptyParsedQuery('NODE_QUERY');
  }

  const queryType = VALID_QUERY_TYPES.has(raw.type) ? (raw.type as QueryType) : 'NODE_QUERY';

  const filters: QueryFilter[] = (raw.filters ?? []).filter(f => {
    return f.field && VALID_COMPARATORS.has(f.comparator);
  }).map(f => ({
    field: f.field,
    comparator: f.comparator as QueryFilter['comparator'],
    value: f.value,
  }));

  const sorts: QuerySort[] = (raw.sorts ?? []).filter(s => s.field).map(s => ({
    field: s.field,
    order: (s.order === 'DESC' ? 'DESC' : 'ASC') as QuerySort['order'],
  }));

  const scope: QueryScope = {
    namespaces: raw.scope?.namespaces?.filter(n => typeof n === 'string') ?? [],
    subsystems: raw.scope?.subsystems?.filter(s => typeof s === 'string') ?? [],
    severities: raw.scope?.severities?.filter(s => typeof s === 'string') ?? [],
  };

  const limit = typeof raw.limit === 'number' && raw.limit > 0 ? Math.min(raw.limit, 1000) : 100;
  const offset = typeof raw.offset === 'number' && raw.offset >= 0 ? raw.offset : 0;

  const historicalRange = raw.historicalRange?.start && raw.historicalRange?.end ? { start: raw.historicalRange.start, end: raw.historicalRange.end } : undefined;

  return {
    queryType,
    filters,
    sorts,
    scope,
    limit,
    offset,
    historicalRange,
    snapshotId: raw.snapshotId ?? undefined,
  };
}

function createEmptyParsedQuery(queryType: QueryType): ParsedQuery {
  return {
    queryType,
    filters: [],
    sorts: [],
    scope: {},
    limit: 100,
    offset: 0,
  };
}
