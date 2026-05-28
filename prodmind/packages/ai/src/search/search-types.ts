export const SEARCH_TYPES = [
  'NODE_SEARCH', 'SUBSYSTEM_SEARCH', 'PATTERN_SEARCH', 'RISK_SEARCH',
  'NARRATIVE_SEARCH', 'RECOMMENDATION_SEARCH', 'COGNITION_SEARCH',
  'TREND_SEARCH', 'REPORT_SEARCH', 'EVIDENCE_SEARCH', 'HOTSPOT_SEARCH',
] as const;
export type SearchType = typeof SEARCH_TYPES[number];

export const SEARCH_MODES = ['EXACT', 'PREFIX', 'CONTAINS'] as const;
export type SearchMode = typeof SEARCH_MODES[number];

export interface SearchQuery {
  searchType: SearchType;
  term: string;
  mode: SearchMode;
  limit: number;
  offset: number;
  scope?: { namespaces?: string[]; subsystems?: string[]; severities?: string[] };
}

export interface SearchResult {
  searchType: SearchType;
  fingerprint: string;
  term: string;
  matches: SearchMatch[];
  total: number;
  executionTimeMs: number;
}

export interface SearchMatch {
  id: string;
  label: string;
  description: string;
  score: number;
  rank: number;
  type: string;
  subsystem?: string;
  severity?: string;
  fingerprint: string;
}

export interface SearchIndex {
  searchType: SearchType;
  entries: SearchIndexEntry[];
  fingerprint: string;
}

export interface SearchIndexEntry {
  id: string;
  label: string;
  description: string;
  type: string;
  subsystem?: string;
  severity?: string;
  fingerprint: string;
  tokens: string[];
}

export interface SearchCacheEntry {
  fingerprint: string;
  result: SearchResult;
  createdAt: string;
}

export interface RetrievalQuery {
  snapshotId?: string;
  types: string[];
  limit: number;
  offset: number;
  filters?: { field: string; comparator: string; value: unknown }[];
}

export interface RetrievalResult<T = unknown> {
  snapshotId?: string;
  data: T[];
  total: number;
  fingerprint: string;
  executionTimeMs: number;
}
