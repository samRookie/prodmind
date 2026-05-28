import { verifyDeterministicInsight } from '../replay/insight-replay.ts';
import type { Insight, InsightEvidence, RemediationPlan } from '../types/index.ts';
import { validateEvidence,validateInsight } from '../validation/insight-validator.ts';

export interface AuditReport {
  timestamp: string;
  insights: AuditInsightEntry[];
  summary: AuditSummary;
}

export interface AuditInsightEntry {
  insightId: string;
  valid: boolean;
  deterministic: boolean;
  evidenceCount: number;
  errors: string[];
}

export interface AuditSummary {
  totalInsights: number;
  validInsights: number;
  deterministicInsights: number;
  totalEvidence: number;
  totalRemediations: number;
}

export function auditInsightSystem(
  insights: Insight[],
  evidence: InsightEvidence[],
  remediations: RemediationPlan[],
): AuditReport {
  const entries: AuditInsightEntry[] = insights.map(insight => {
    const errors = validateInsight(insight);
    const deterministic = verifyDeterministicInsight(insight);
    return {
      insightId: insight.id,
      valid: errors.length === 0,
      deterministic,
      evidenceCount: insight.evidence.length,
      errors,
    };
  });

  const summary: AuditSummary = {
    totalInsights: insights.length,
    validInsights: entries.filter(e => e.valid).length,
    deterministicInsights: entries.filter(e => e.deterministic).length,
    totalEvidence: evidence.length,
    totalRemediations: remediations.length,
  };

  return { timestamp: new Date().toISOString(), insights: entries, summary };
}

export function auditEvidenceIntegrity(evidence: InsightEvidence[]): AuditReport {
  const entries: AuditInsightEntry[] = evidence.map(e => ({
    insightId: e.insightId,
    valid: validateEvidence(e).length === 0,
    deterministic: e.fingerprint.length > 0,
    evidenceCount: 1,
    errors: validateEvidence(e),
  }));
  const summary: AuditSummary = {
    totalInsights: evidence.length,
    validInsights: entries.filter(e => e.valid).length,
    deterministicInsights: entries.filter(e => e.deterministic).length,
    totalEvidence: evidence.length,
    totalRemediations: 0,
  };
  return { timestamp: new Date().toISOString(), insights: entries, summary };
}
