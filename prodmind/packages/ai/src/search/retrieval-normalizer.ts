import type { RetrievalQuery } from './search-types.ts';

export function normalizeRetrievalQuery(query: RetrievalQuery): RetrievalQuery {
  return {
    snapshotId: query.snapshotId,
    types: [...new Set(query.types)].sort(),
    limit: Math.max(1, Math.min(query.limit, 1000)),
    offset: Math.max(0, query.offset),
    filters: query.filters ? query.filters.map(f => ({
      field: f.field,
      comparator: f.comparator,
      value: f.value,
    })).sort((a, b) => a.field.localeCompare(b.field)) : undefined,
  };
}
