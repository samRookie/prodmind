import type { ReportType } from '../reporting/reporting-types.ts';
import type { TrendType } from '../timeseries/timeseries-types.ts';

export const QUERY_TYPES = [
  'NODE_QUERY', 'EDGE_QUERY', 'SCC_QUERY', 'HOTSPOT_QUERY',
  'RISK_QUERY', 'PATTERN_QUERY', 'RECOMMENDATION_QUERY',
  'PROPAGATION_QUERY', 'TREND_QUERY', 'DIFF_QUERY',
  'COGNITION_QUERY', 'HISTORY_QUERY',
] as const;
export type QueryType = typeof QUERY_TYPES[number];

export const COMPARATORS = ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'IN', 'NOT_IN', 'CONTAINS', 'STARTS_WITH'] as const;
export type Comparator = typeof COMPARATORS[number];

export const SORT_ORDERS = ['ASC', 'DESC'] as const;
export type SortOrder = typeof SORT_ORDERS[number];

export interface QueryFilter {
  field: string;
  comparator: Comparator;
  value: unknown;
}

export interface QuerySort {
  field: string;
  order: SortOrder;
}

export interface QueryScope {
  namespaces?: string[];
  subsystems?: string[];
  severities?: string[];
}

export interface ParsedQuery {
  queryType: QueryType;
  filters: QueryFilter[];
  sorts: QuerySort[];
  scope: QueryScope;
  limit: number;
  offset: number;
  historicalRange?: { start: string; end: string };
  snapshotId?: string;
}

export type SortKey = string;

export interface QueryResult<T = unknown> {
  queryType: QueryType;
  fingerprint: string;
  data: T[];
  total: number;
  offset: number;
  limit: number;
  executionTimeMs: number;
}

export interface QueryCacheEntry {
  fingerprint: string;
  result: QueryResult;
  createdAt: string;
}

export interface QueryPlan {
  queryType: QueryType;
  indexUsage: string[];
  estimatedCost: number;
  estimatedRows: number;
  sortStrategy: string;
  filterPushdown: boolean;
}

export interface QueryContext {
  snapshotId?: string;
  historicalSnapshots?: { id: string; createdAt: string }[];
  nodes?: { id: string; type: string; name: string; subsystem?: string; namespace?: string }[];
  edges?: { sourceId: string; targetId: string; type: string }[];
  sccs?: { id: string; nodes: string[] }[];
  hotspots?: { nodeId: string; severity: string }[];
  risks?: { riskType: string; severity: string; normalizedScore: number; impactedNodes: string[] }[];
  patterns?: { patternType: string; severity: string; impactedNodes: string[] }[];
  recommendations?: { category: string; priority: string; impactedNodes: string[] }[];
  narratives?: { narrativeType: string; severity: string }[];
  reports?: { reportType: ReportType }[];
  trends?: { trendType: TrendType }[];
  cognitions?: { cognitionType: string }[];
}
