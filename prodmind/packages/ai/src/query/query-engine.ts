import type { QueryContext, QueryResult } from './query-types.ts';
import type { RawQuery } from './query-parser.ts';
import { parseQuery } from './query-parser.ts';
import { validateQuery } from './query-validator.ts';
import { normalizeQuery } from './query-normalizer.ts';
import { fingerprintQuery } from './query-fingerprint.ts';
import { QueryPlanner } from './query-planner.ts';
import { QueryExecutor } from './query-executor.ts';
import { QueryCache } from './query-cache.ts';

export class QueryEngine {
  private planner = new QueryPlanner();
  private executor = new QueryExecutor();
  private cache = new QueryCache();

  query<T extends Record<string, unknown>>(raw: RawQuery, context: QueryContext): QueryResult<T> {
    const parsed = parseQuery(raw);
    const normalized = normalizeQuery(parsed);
    const fp = fingerprintQuery(normalized);

    const cached = this.cache.get(fp);
    if (cached) return cached as QueryResult<T>;

    const errors = validateQuery(normalized);
    if (errors.length > 0) {
      return {
        queryType: normalized.queryType,
        fingerprint: fp,
        data: [],
        total: 0,
        offset: normalized.offset,
        limit: normalized.limit,
        executionTimeMs: 0,
      };
    }

    this.planner.plan(normalized, context);

    const result = this.executor.execute<T>(normalized, context);
    this.cache.set(fp, result);
    return result;
  }

  explain(raw: RawQuery, context: QueryContext) {
    const parsed = parseQuery(raw);
    const normalized = normalizeQuery(parsed);
    return this.planner.plan(normalized, context);
  }

  validate(raw: RawQuery) {
    const parsed = parseQuery(raw);
    const normalized = normalizeQuery(parsed);
    return validateQuery(normalized);
  }

  get cacheSnapshot() {
    return this.cache.snapshot();
  }

  clearCache() {
    this.cache.clear();
  }
}
