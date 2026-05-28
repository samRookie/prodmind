import type { ParsedQuery, QueryPlan, QueryContext } from './query-types.ts';

export class QueryPlanner {
  plan(query: ParsedQuery, context: QueryContext): QueryPlan {
    const indexUsage = this.determineIndexUsage(query, context);
    const estimatedCost = this.estimateCost(query, context, indexUsage);
    const estimatedRows = this.estimateRows(query, context);
    const sortStrategy = this.determineSortStrategy(query);
    const filterPushdown = this.canPushdownFilters(query, context);

    return {
      queryType: query.queryType,
      indexUsage,
      estimatedCost,
      estimatedRows,
      sortStrategy,
      filterPushdown,
    };
  }

  private determineIndexUsage(query: ParsedQuery, context: QueryContext): string[] {
    const indexes: string[] = [];
    if (context.nodes && query.queryType === 'NODE_QUERY') indexes.push('node_index');
    if (context.edges && query.queryType === 'EDGE_QUERY') indexes.push('edge_index');
    if (context.sccs && query.queryType === 'SCC_QUERY') indexes.push('scc_index');
    if (context.hotspots && query.queryType === 'HOTSPOT_QUERY') indexes.push('hotspot_index');
    if (context.risks && (query.queryType === 'RISK_QUERY' || query.queryType === 'PROPAGATION_QUERY')) indexes.push('risk_index');
    if (context.patterns && query.queryType === 'PATTERN_QUERY') indexes.push('pattern_index');
    if (context.recommendations && query.queryType === 'RECOMMENDATION_QUERY') indexes.push('recommendation_index');
    if (context.narratives && query.queryType === 'COGNITION_QUERY') indexes.push('narrative_index');
    if (context.trends && query.queryType === 'TREND_QUERY') indexes.push('trend_index');
    return [...new Set(indexes)];
  }

  private estimateCost(_query: ParsedQuery, context: QueryContext, indexes: string[]): number {
    const baseCost = 10;
    const indexDiscount = indexes.length * 5;
    const dataSize = this.estimateTotalData(context);
    return Math.max(baseCost, dataSize - indexDiscount);
  }

  private estimateRows(query: ParsedQuery, context: QueryContext): number {
    const total = this.estimateTotalData(context);
    const filterSelectivity = query.filters.length > 0 ? Math.max(1, total / (query.filters.length * 2)) : total;
    return Math.min(filterSelectivity, query.limit);
  }

  private estimateTotalData(context: QueryContext): number {
    return Math.max(
      context.nodes?.length ?? 0,
      context.edges?.length ?? 0,
      context.risks?.length ?? 0,
      context.patterns?.length ?? 0,
      context.recommendations?.length ?? 0,
      context.hotspots?.length ?? 0,
      1,
    );
  }

  private determineSortStrategy(query: ParsedQuery): string {
    if (query.sorts.length === 0) return 'no_sort';
    if (query.sorts.length <= 2) return 'index_sort';
    return 'memory_sort';
  }

  private canPushdownFilters(_query: ParsedQuery, _context: QueryContext): boolean {
    return true;
  }
}
