import type { SearchQuery } from './search-types.ts';

export function normalizeSearchQuery(query: SearchQuery): SearchQuery {
  return {
    searchType: query.searchType,
    term: query.term.trim().toLowerCase(),
    mode: query.mode,
    limit: Math.max(1, Math.min(query.limit, 500)),
    offset: Math.max(0, query.offset),
    scope: query.scope ? {
      namespaces: [...(query.scope.namespaces ?? [])].sort(),
      subsystems: [...(query.scope.subsystems ?? [])].sort(),
      severities: [...(query.scope.severities ?? [])].sort(),
    } : undefined,
  };
}

export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-zA-Z0-9_]/).filter(t => t.length > 0);
}
