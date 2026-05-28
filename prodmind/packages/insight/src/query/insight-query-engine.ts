import type { Insight, InsightQuery } from '../types/index.ts';

export class InsightQueryEngine {
  query(insights: Insight[], filter: InsightQuery): Insight[] {
    let results = [...insights];
    if (filter.categories && filter.categories.length > 0) {
      results = results.filter(i => filter.categories!.includes(i.category));
    }
    if (filter.severities && filter.severities.length > 0) {
      results = results.filter(i => filter.severities!.includes(i.severity));
    }
    if (filter.statuses && filter.statuses.length > 0) {
      results = results.filter(i => filter.statuses!.includes(i.status));
    }
    if (filter.minConfidence !== undefined) {
      results = results.filter(i => i.scores.confidence >= filter.minConfidence!);
    }
    if (filter.minSeverity !== undefined) {
      results = results.filter(i => i.scores.severity >= filter.minSeverity!);
    }
    if (filter.nodeIds && filter.nodeIds.length > 0) {
      results = results.filter(i =>
        i.context.nodeIds.some(nid => filter.nodeIds!.includes(nid)),
      );
    }
    if (filter.before) {
      results = results.filter(i => i.timestamp <= filter.before!);
    }
    if (filter.after) {
      results = results.filter(i => i.timestamp >= filter.after!);
    }
    if (filter.maxResults) {
      results = results.slice(0, filter.maxResults);
    }
    return results.sort((a, b) => b.scores.overall - a.scores.overall);
  }
}
