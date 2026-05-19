import { ValidationSeverity, ValidationCategory, ValidationState } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue, SnapshotValidationResult } from './validation-types.ts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.SNAPSHOT, message, nodeId: null, edgeId: null, metadataJson: null };
}

export function validateCompressionAvailability(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ctx.nodeMap.size === 0) {
    issues.push(makeIssue('NO_GRAPH_DATA', ValidationSeverity.CRITICAL,
      'Snapshot has no graph data — compression unavailable'));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateSemanticAvailability(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ctx.classifications.size === 0) {
    issues.push(makeIssue('NO_SEMANTIC_CLASSIFICATIONS', ValidationSeverity.ERROR,
      'Snapshot has no semantic classifications'));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateMetricsAvailability(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ctx.centrality.size === 0) {
    issues.push(makeIssue('NO_CENTRALITY_METRICS', ValidationSeverity.WARNING,
      'Snapshot has no centrality metrics'));
  }

  if (ctx.instability.size === 0) {
    issues.push(makeIssue('NO_INSTABILITY_METRICS', ValidationSeverity.WARNING,
      'Snapshot has no instability metrics'));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateRetrievalAvailability(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (ctx.nodeMap.size < 3) {
    issues.push(makeIssue('INSUFFICIENT_NODES_FOR_RETRIEVAL', ValidationSeverity.WARNING,
      `Snapshot has only ${ctx.nodeMap.size} nodes — retrieval may be limited`));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function computeReadinessScore(issues: ValidationIssue[]): number {
  if (issues.length === 0) return 1;

  const criticalCount = issues.filter((i) => i.severity === ValidationSeverity.CRITICAL).length;
  const errorCount = issues.filter((i) => i.severity === ValidationSeverity.ERROR).length;
  const warningCount = issues.filter((i) => i.severity === ValidationSeverity.WARNING).length;

  let score = 1;
  score -= criticalCount * 0.25;
  score -= errorCount * 0.1;
  score -= warningCount * 0.02;

  return Math.max(0, Math.min(1, score));
}

export function computeIntegrityScore(issues: ValidationIssue[]): number {
  return computeReadinessScore(issues);
}

export function determineValidationState(issues: ValidationIssue[]): ValidationState {
  const critical = issues.some((i) => i.severity === ValidationSeverity.CRITICAL);
  const errors = issues.some((i) => i.severity === ValidationSeverity.ERROR);
  const warnings = issues.some((i) => i.severity === ValidationSeverity.WARNING);

  if (critical) return ValidationState.INVALID;
  if (errors) return ValidationState.DEGRADED;
  if (warnings) return ValidationState.DEGRADED;
  return ValidationState.VALID;
}

export interface ReadinessCheck {
  graphExists: boolean;
  semanticExists: boolean;
  metricsExist: boolean;
  retrievalReady: boolean;
  noCriticalIssues: boolean;
  noErrorIssues: boolean;
}

export function checkReadiness(ctx: ValidationContext, allIssues: ValidationIssue[]): ReadinessCheck {
  const criticalCount = allIssues.filter((i) => i.severity === ValidationSeverity.CRITICAL).length;
  const errorCount = allIssues.filter((i) => i.severity === ValidationSeverity.ERROR).length;

  return {
    graphExists: ctx.nodeMap.size > 0,
    semanticExists: ctx.classifications.size > 0,
    metricsExist: ctx.centrality.size > 0 || ctx.instability.size > 0,
    retrievalReady: ctx.nodeMap.size >= 3,
    noCriticalIssues: criticalCount === 0,
    noErrorIssues: errorCount === 0,
  };
}

export function validateSnapshotReadiness(ctx: ValidationContext, allIssues: ValidationIssue[]): SnapshotValidationResult {
  const readiness = checkReadiness(ctx, allIssues);
  const readinessScore = computeReadinessScore(allIssues);
  const integrityScore = computeIntegrityScore(allIssues);
  const state = determineValidationState(allIssues);

  const readinessIssues: ValidationIssue[] = [];
  if (!readiness.graphExists) {
    readinessIssues.push(makeIssue('SNAPSHOT_NO_GRAPH', ValidationSeverity.CRITICAL,
      'Snapshot readiness check failed: no graph data exists'));
  }
  if (!readiness.semanticExists) {
    readinessIssues.push(makeIssue('SNAPSHOT_NO_SEMANTIC', ValidationSeverity.ERROR,
      'Snapshot readiness check: no semantic classifications'));
  }
  if (!readiness.metricsExist) {
    readinessIssues.push(makeIssue('SNAPSHOT_NO_METRICS', ValidationSeverity.WARNING,
      'Snapshot readiness check: no metrics computed'));
  }

  return {
    issues: readinessIssues,
    readinessScore,
    integrityScore,
    validationState: state,
    isReady: readiness.graphExists && readiness.noCriticalIssues,
  };
}
