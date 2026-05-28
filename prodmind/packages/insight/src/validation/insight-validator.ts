import type { Insight, InsightEvidence, RemediationPlan } from '../types/index.ts';

export function validateInsight(insight: Insight): string[] {
  const errors: string[] = [];
  if (!insight.id) errors.push('missing id');
  if (!insight.category) errors.push('missing category');
  if (!insight.severity) errors.push('missing severity');
  if (!insight.title) errors.push('missing title');
  if (!insight.fingerprint) errors.push('missing fingerprint');
  if (insight.scores.overall < 0 || insight.scores.overall > 1) errors.push('overall score out of range');
  if (insight.scores.confidence < 0 || insight.scores.confidence > 1) errors.push('confidence out of range');
  return errors;
}

export function validateEvidence(evidence: InsightEvidence): string[] {
  const errors: string[] = [];
  if (!evidence.id) errors.push('missing id');
  if (!evidence.type) errors.push('missing type');
  if (!evidence.source) errors.push('missing source');
  if (!evidence.fingerprint) errors.push('missing fingerprint');
  return errors;
}

export function validateRemediation(plan: RemediationPlan): string[] {
  const errors: string[] = [];
  if (!plan.id) errors.push('missing id');
  if (!plan.strategy) errors.push('missing strategy');
  if (plan.steps.length === 0) errors.push('no remediation steps');
  return errors;
}

export function validateDeterminism(insight: Insight): boolean {
  return insight.evidence.every(e => e.fingerprint.length > 0) && insight.fingerprint.length > 0;
}
