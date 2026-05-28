import type { InvestigationInsight, HypothesisRecord, TimelineEventType } from '../types/index.ts';
import { SessionError } from '../errors/index.ts';
import { paginate } from '../utils/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

export interface InsightFilter {
  categories?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvestigationSummary {
  sessionId: string;
  totalInsights: number;
  totalHypotheses: number;
  hypothesesByStatus: Record<string, number>;
  insightsByCategory: Record<string, number>;
  averageConfidence: number;
  latestActivity: string;
}

export class InvestigationQueryEngine {
  private readonly insights: InvestigationInsight[];
  private readonly hypotheses: HypothesisRecord[];
  private readonly events: TimelineEvent[];

  public constructor(
    insights: InvestigationInsight[] = [],
    hypotheses: HypothesisRecord[] = [],
    events: TimelineEvent[] = [],
  ) {
    this.insights = insights;
    this.hypotheses = hypotheses;
    this.events = events;
  }

  public findInsightsBySession(sessionId: string, filter?: InsightFilter, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<InvestigationInsight>> {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }

    let results = this.insights.filter((i) => i.sessionId === sessionId);

    if (filter) {
      results = this.applyInsightFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findInsightsByCategory(sessionId: string, category: string, filter?: InsightFilter, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<InvestigationInsight>> {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }
    if (!category) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Category is required', { category });
    }

    let results = this.insights.filter((i) => i.sessionId === sessionId && i.category === category);

    if (filter) {
      results = this.applyInsightFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findInsightsByConfidence(sessionId: string, minConfidence: number, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<InvestigationInsight>> {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }
    if (minConfidence < 0 || minConfidence > 1) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Confidence must be between 0 and 1', { minConfidence });
    }

    const results = this.insights.filter(
      (i) => i.sessionId === sessionId && i.confidence >= minConfidence,
    );

    return paginate(results, page, pageSize);
  }

  public getHypothesisHistory(sessionId: string): HypothesisRecord[] {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }

    return this.hypotheses
      .filter((h) => h.id.includes(sessionId) || this.events.some((e) => e.sessionId === sessionId && e.payloadJson?.includes(h.id)))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public getInvestigationTimeline(sessionId: string): TimelineEvent[] {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }

    const investigationTypes: TimelineEventType[] = [
      'HYPOTHESIS_FORMED',
      'HYPOTHESIS_UPDATED',
      'HYPOTHESIS_CONFIRMED',
      'HYPOTHESIS_REJECTED',
      'INSIGHT_RECORDED',
      'RISK_IDENTIFIED',
      'AI_INTERACTION',
      'AI_QUERY',
      'AI_RESPONSE',
    ];

    return this.events
      .filter((e) => e.sessionId === sessionId && investigationTypes.includes(e.eventType))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getInvestigationSummary(sessionId: string): InvestigationSummary {
    if (!sessionId) {
      throw new SessionError('INVESTIGATION_QUERY_ERROR', 'Session ID is required', { sessionId });
    }

    const sessionInsights = this.insights.filter((i) => i.sessionId === sessionId);
    const sessionHypotheses = this.hypotheses.filter(
      (h) => h.id.includes(sessionId) || this.events.some((e) => e.sessionId === sessionId),
    );

    const hypothesesByStatus: Record<string, number> = {};
    for (const h of sessionHypotheses) {
      hypothesesByStatus[h.status] = (hypothesesByStatus[h.status] ?? 0) + 1;
    }

    const insightsByCategory: Record<string, number> = {};
    let totalConfidence = 0;
    for (const i of sessionInsights) {
      insightsByCategory[i.category] = (insightsByCategory[i.category] ?? 0) + 1;
      totalConfidence += i.confidence;
    }

    const allTimestamps = [
      ...sessionInsights.map((i) => i.createdAt),
      ...sessionHypotheses.map((h) => h.createdAt),
      ...this.events.filter((e) => e.sessionId === sessionId).map((e) => e.timestamp),
    ];

    const latestActivity = allTimestamps.length > 0
      ? allTimestamps.sort().reverse()[0] ?? ''
      : '';

    return {
      sessionId,
      totalInsights: sessionInsights.length,
      totalHypotheses: sessionHypotheses.length,
      hypothesesByStatus,
      insightsByCategory,
      averageConfidence: sessionInsights.length > 0 ? totalConfidence / sessionInsights.length : 0,
      latestActivity,
    };
  }

  private applyInsightFilter(insights: InvestigationInsight[], filter: InsightFilter): InvestigationInsight[] {
    return insights.filter((i) => {
      if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(i.category)) {
        return false;
      }
      if (filter.minConfidence !== undefined && i.confidence < filter.minConfidence) return false;
      if (filter.maxConfidence !== undefined && i.confidence > filter.maxConfidence) return false;
      if (filter.dateFrom && i.createdAt < filter.dateFrom) return false;
      if (filter.dateTo && i.createdAt > filter.dateTo) return false;
      return true;
    });
  }
}
