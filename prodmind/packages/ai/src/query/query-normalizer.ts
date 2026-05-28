import type { ParsedQuery, QueryFilter, QuerySort, QueryScope } from './query-types.ts';

export function normalizeQuery(query: ParsedQuery): ParsedQuery {
  const normalizedFilters: QueryFilter[] = [...query.filters]
    .filter(f => f.field && f.value !== undefined && f.value !== null)
    .sort((a, b) => a.field.localeCompare(b.field))
    .map(f => ({
      field: f.field,
      comparator: f.comparator,
      value: normalizeValue(f.value),
    }));

  const normalizedSorts: QuerySort[] = [...query.sorts]
    .filter(s => s.field)
    .sort((a, b) => a.field.localeCompare(b.field))
    .map(s => ({
      field: s.field,
      order: s.order,
    }));

  const normalizedScope: QueryScope = {
    namespaces: [...(query.scope?.namespaces ?? [])].sort(),
    subsystems: [...(query.scope?.subsystems ?? [])].sort(),
    severities: [...(query.scope?.severities ?? [])].sort(),
  };

  if (normalizedScope.namespaces!.length === 0) delete normalizedScope.namespaces;
  if (normalizedScope.subsystems!.length === 0) delete normalizedScope.subsystems;
  if (normalizedScope.severities!.length === 0) delete normalizedScope.severities;

  return {
    queryType: query.queryType,
    filters: normalizedFilters,
    sorts: normalizedSorts,
    scope: normalizedScope,
    limit: query.limit,
    offset: query.offset,
    historicalRange: query.historicalRange ? { start: query.historicalRange.start, end: query.historicalRange.end } : undefined,
    snapshotId: query.snapshotId,
  };
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value].sort((a, b) => String(a).localeCompare(String(b)));
  }
  if (typeof value === 'string') return value.trim();
  return value;
}
