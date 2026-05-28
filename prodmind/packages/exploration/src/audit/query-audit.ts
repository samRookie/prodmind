import type { GraphQuery, QueryPlan } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export class QueryAudit {
  private entries: Array<{
    queryId: string;
    dsl: string;
    target: string;
    duration: number;
    resultCount: number;
    planSteps: string[];
    timestamp: string;
    fingerprint: string;
  }> = [];

  public recordQuery(
    query: GraphQuery,
    duration: number,
    resultCount: number,
    plan: QueryPlan,
  ): void {
    this.entries.push({
      queryId: query.id,
      dsl: query.raw,
      target: query.target,
      duration,
      resultCount,
      planSteps: plan.steps,
      timestamp: nowISO(),
      fingerprint: query.fingerprint,
    });
  }

  public getQueryAudit(
    queryId?: string,
  ): Array<{
    queryId: string;
    dsl: string;
    target: string;
    duration: number;
    resultCount: number;
    planSteps: string[];
    timestamp: string;
    fingerprint: string;
  }> {
    if (queryId) {
      return this.entries.filter((e) => e.queryId === queryId);
    }
    return [...this.entries];
  }

  public verifyQueryAudit(queryId: string): {
    verified: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const relevant = this.entries.filter((e) => e.queryId === queryId);
    if (relevant.length === 0) {
      return { verified: false, issues: [`No audit entries for query ${queryId}`] };
    }
    for (const entry of relevant) {
      if (!entry.dsl) issues.push('Entry missing DSL');
      if (!entry.target) issues.push('Entry missing target');
      if (entry.duration < 0) issues.push('Entry has negative duration');
      if (entry.resultCount < 0) issues.push('Entry has negative resultCount');
      if (!entry.fingerprint) issues.push('Entry missing fingerprint');
    }
    return { verified: issues.length === 0, issues };
  }

  public clear(): void {
    this.entries = [];
  }
}
