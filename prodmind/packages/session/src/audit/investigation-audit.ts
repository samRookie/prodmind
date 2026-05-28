import { AuditError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';
import type { InvestigationInsight, HypothesisRecord } from '../types/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

export interface InvestigationAuditReport {
  sessionId: string;
  timestamp: string;
  passed: boolean;
  hypothesisAuditPassed: boolean;
  decisionPathAuditPassed: boolean;
  evidenceChainAuditPassed: boolean;
  issues: string[];
  details: {
    hypothesisIssues: string[];
    decisionPathIssues: string[];
    evidenceChainIssues: string[];
    totalHypotheses: number;
    totalDecisions: number;
    totalEvidenceItems: number;
  };
}

export class InvestigationAuditor {
  public auditInvestigation(
    sessionId: string,
    hypotheses: HypothesisRecord[],
    insights: InvestigationInsight[],
    events: TimelineEvent[],
  ): InvestigationAuditReport {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const issues: string[] = [];
    const hypothesisIssues = this.auditHypothesisEvolutionInternal(hypotheses);
    const decisionPathIssues = this.auditDecisionPathInternal(events);
    const evidenceChainIssues = this.auditEvidenceChainInternal(insights, events);

    issues.push(...hypothesisIssues, ...decisionPathIssues, ...evidenceChainIssues);

    return {
      sessionId,
      timestamp: nowISO(),
      passed: issues.length === 0,
      hypothesisAuditPassed: hypothesisIssues.length === 0,
      decisionPathAuditPassed: decisionPathIssues.length === 0,
      evidenceChainAuditPassed: evidenceChainIssues.length === 0,
      issues,
      details: {
        hypothesisIssues,
        decisionPathIssues,
        evidenceChainIssues,
        totalHypotheses: hypotheses.length,
        totalDecisions: events.filter((e) =>
          ['HYPOTHESIS_FORMED', 'HYPOTHESIS_UPDATED', 'HYPOTHESIS_CONFIRMED', 'HYPOTHESIS_REJECTED'].includes(e.eventType),
        ).length,
        totalEvidenceItems: insights.length,
      },
    };
  }

  public auditHypothesisEvolution(sessionId: string, hypotheses: HypothesisRecord[]): InvestigationAuditReport {
    return this.auditInvestigation(sessionId, hypotheses, [], []);
  }

  public auditDecisionPath(sessionId: string, events: TimelineEvent[]): InvestigationAuditReport {
    return this.auditInvestigation(sessionId, [], [], events);
  }

  public auditEvidenceChain(sessionId: string, insights: InvestigationInsight[], events: TimelineEvent[]): InvestigationAuditReport {
    return this.auditInvestigation(sessionId, [], insights, events);
  }

  public generateInvestigationReport(
    sessionId: string,
    hypotheses: HypothesisRecord[],
    insights: InvestigationInsight[],
    events: TimelineEvent[],
  ): InvestigationAuditReport {
    return this.auditInvestigation(sessionId, hypotheses, insights, events);
  }

  private auditHypothesisEvolutionInternal(hypotheses: HypothesisRecord[]): string[] {
    const issues: string[] = [];

    const statusOrder = ['PROPOSED', 'TESTING', 'CONFIRMED', 'REJECTED'];

    for (let i = 1; i < hypotheses.length; i++) {
      const prev = hypotheses[i - 1]!;
      const curr = hypotheses[i]!;

      const prevStatusIdx = statusOrder.indexOf(prev.status);
      const currStatusIdx = statusOrder.indexOf(curr.status);

      if (currStatusIdx >= 0 && prevStatusIdx >= 0 && currStatusIdx < prevStatusIdx) {
        issues.push(`Hypothesis status regression: ${prev.id} from ${prev.status} to ${curr.status}`);
      }

      const prevTime = new Date(prev.createdAt).getTime();
      const currTime = new Date(curr.createdAt).getTime();
      if (currTime < prevTime) {
        issues.push(`Hypothesis timestamp out of order: ${prev.id} at ${prev.createdAt} then ${curr.id} at ${curr.createdAt}`);
      }
    }

    const confirmed = hypotheses.filter((h) => h.status === 'CONFIRMED');
    for (const h of confirmed) {
      if (!h.evidence || h.evidence.length === 0) {
        issues.push(`Hypothesis ${h.id} is confirmed but has no evidence`);
      }
    }

    const rejected = hypotheses.filter((h) => h.status === 'REJECTED');
    for (const h of rejected) {
      if (!h.evidence || h.evidence.length === 0) {
        issues.push(`Hypothesis ${h.id} is rejected but has no evidence`);
      }
    }

    return issues;
  }

  private auditDecisionPathInternal(events: TimelineEvent[]): string[] {
    const issues: string[] = [];

    const decisionEvents = events.filter((e) =>
      ['HYPOTHESIS_FORMED', 'HYPOTHESIS_UPDATED', 'HYPOTHESIS_CONFIRMED', 'HYPOTHESIS_REJECTED'].includes(e.eventType),
    );

    if (decisionEvents.length === 0) {
      return ['No decision events found in investigation timeline'];
    }

    const sorted = [...decisionEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (const event of sorted) {
      if (event.payloadJson) {
        try {
          const payload = JSON.parse(event.payloadJson);
          if (event.eventType === 'HYPOTHESIS_FORMED' && (!payload.hypothesis || !payload.statement)) {
            issues.push(`Hypothesis formation event ${event.id} is missing hypothesis data`);
          }
        } catch {
          issues.push(`Event ${event.id} has invalid JSON payload`);
        }
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;

      if (prev.eventType === 'HYPOTHESIS_CONFIRMED' && curr.eventType === 'HYPOTHESIS_FORMED') {
        continue;
      }

      if (prev.eventType === curr.eventType && prev.eventType === 'HYPOTHESIS_FORMED') {
        if (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime() < 1000) {
          issues.push(`Rapid consecutive hypothesis formations: ${prev.id} then ${curr.id}`);
        }
      }
    }

    return issues;
  }

  private auditEvidenceChainInternal(
    insights: InvestigationInsight[],
    events: TimelineEvent[],
  ): string[] {
    const issues: string[] = [];

    if (insights.length === 0) {
      return ['No insights recorded'];
    }

    for (const insight of insights) {
      if (!insight.sessionId) {
        issues.push(`Insight ${insight.id} has no session ID`);
      }

      if (insight.confidence < 0 || insight.confidence > 1) {
        issues.push(`Insight ${insight.id} has invalid confidence: ${insight.confidence}`);
      }

      if (insight.sourceEventId) {
        const eventExists = events.some((e) => e.id === insight.sourceEventId);
        if (!eventExists) {
          issues.push(`Insight ${insight.id} references non-existent source event: ${insight.sourceEventId}`);
        }
      }
    }

    for (let i = 1; i < insights.length; i++) {
      const prev = insights[i - 1]!;
      const curr = insights[i]!;
      const prevTime = new Date(prev.createdAt).getTime();
      const currTime = new Date(curr.createdAt).getTime();
      if (currTime < prevTime) {
        issues.push(`Insight timestamps out of order: ${prev.id} then ${curr.id}`);
      }
    }

    return issues;
  }
}
