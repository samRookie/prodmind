import type { ValidationIssue, ValidationSummary, IntegrityMetrics } from './validation-types.ts';
import { ValidationSeverity } from '@prodmind/contracts';

export interface ValidationReport {
  snapshotId: string;
  issues: ValidationIssue[];
  summary: ValidationSummary;
  integrityMetrics: IntegrityMetrics;
  criticalIssues: ValidationIssue[];
  errorIssues: ValidationIssue[];
  warningIssues: ValidationIssue[];
  infoIssues: ValidationIssue[];
  generatedAt: string;
}

export function generateValidationReport(
  snapshotId: string,
  issues: ValidationIssue[],
  summary: ValidationSummary,
  metrics: IntegrityMetrics,
): ValidationReport {
  return {
    snapshotId,
    issues,
    summary,
    integrityMetrics: metrics,
    criticalIssues: issues.filter((i) => i.severity === ValidationSeverity.CRITICAL),
    errorIssues: issues.filter((i) => i.severity === ValidationSeverity.ERROR),
    warningIssues: issues.filter((i) => i.severity === ValidationSeverity.WARNING),
    infoIssues: issues.filter((i) => i.severity === ValidationSeverity.INFO),
    generatedAt: new Date().toISOString(),
  };
}

export function aggregateValidationMetrics(issues: ValidationIssue[]): IntegrityMetrics {
  return {
    integrityScore: computeScore(issues, 'integrity'),
    readinessScore: computeScore(issues, 'readiness'),
    criticalIssueCount: issues.filter((i) => i.severity === ValidationSeverity.CRITICAL).length,
    errorIssueCount: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length,
    warningIssueCount: issues.filter((i) => i.severity === ValidationSeverity.WARNING).length,
    infoIssueCount: issues.filter((i) => i.severity === ValidationSeverity.INFO).length,
  };
}

function computeScore(issues: ValidationIssue[], type: 'integrity' | 'readiness'): number {
  if (issues.length === 0) return 1;

  const criticalCount = issues.filter((i) => i.severity === ValidationSeverity.CRITICAL).length;
  const errorCount = issues.filter((i) => i.severity === ValidationSeverity.ERROR).length;
  const warningCount = issues.filter((i) => i.severity === ValidationSeverity.WARNING).length;

  let score = 1;
  score -= criticalCount * (type === 'integrity' ? 0.25 : 0.3);
  score -= errorCount * 0.1;
  score -= warningCount * 0.02;

  return Math.max(0, Math.min(1, score));
}

export function summarizeCriticalIssues(issues: ValidationIssue[]): string[] {
  return issues
    .filter((i) => i.severity === ValidationSeverity.CRITICAL)
    .sort((a, b) => a.issueCode.localeCompare(b.issueCode))
    .map((i) => `[${i.issueCode}] ${i.message}`);
}

export function computeIntegrityScore(issues: ValidationIssue[]): number {
  return computeScore(issues, 'integrity');
}
