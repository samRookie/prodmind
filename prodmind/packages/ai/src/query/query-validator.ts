import type { ParsedQuery, QueryType } from './query-types.ts';

const VALID_FIELDS: Record<QueryType, string[]> = {
  NODE_QUERY: ['id', 'type', 'name', 'subsystem', 'namespace'],
  EDGE_QUERY: ['sourceId', 'targetId', 'type'],
  SCC_QUERY: ['id'],
  HOTSPOT_QUERY: ['nodeId', 'severity', 'reason'],
  RISK_QUERY: ['riskType', 'severity', 'normalizedScore', 'title', 'impactedNodes'],
  PATTERN_QUERY: ['patternType', 'severity', 'title', 'impactedNodes'],
  RECOMMENDATION_QUERY: ['category', 'priority', 'title', 'impactedNodes'],
  PROPAGATION_QUERY: ['nodeId', 'propagationPressure', 'severity'],
  TREND_QUERY: ['trendType', 'direction', 'severity', 'confidence'],
  DIFF_QUERY: ['diffType', 'severity', 'fingerprint'],
  COGNITION_QUERY: ['cognitionType', 'fingerprint'],
  HISTORY_QUERY: ['snapshotId', 'createdAt'],
};

export interface ValidationError {
  field: string;
  message: string;
}

export function validateQuery(query: ParsedQuery): ValidationError[] {
  const errors: ValidationError[] = [];

  const allowedFields = VALID_FIELDS[query.queryType];
  if (!allowedFields) {
    errors.push({ field: 'queryType', message: `Unknown query type: ${query.queryType}` });
    return errors;
  }

  for (const filter of query.filters) {
    if (!allowedFields.includes(filter.field)) {
      errors.push({ field: filter.field, message: `Field "${filter.field}" is not valid for query type ${query.queryType}` });
    }
  }

  for (const sort of query.sorts) {
    if (!allowedFields.includes(sort.field)) {
      errors.push({ field: sort.field, message: `Sort field "${sort.field}" is not valid for query type ${query.queryType}` });
    }
  }

  if (query.limit < 1) {
    errors.push({ field: 'limit', message: 'Limit must be >= 1' });
  }
  if (query.limit > 10000) {
    errors.push({ field: 'limit', message: 'Limit must be <= 10000' });
  }
  if (query.offset < 0) {
    errors.push({ field: 'offset', message: 'Offset must be >= 0' });
  }

  return errors;
}
