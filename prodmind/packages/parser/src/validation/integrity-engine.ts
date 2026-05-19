import type { ValidationInput, ValidationContext, ValidationIssue, ValidationSummary, IntegrityMetrics } from './validation-types.ts';
import type { GraphValidationResult } from './validation-types.ts';
import type { SemanticValidationResult } from './validation-types.ts';
import type { RetrievalValidationResult } from './validation-types.ts';
import type { SnapshotValidationResult } from './validation-types.ts';
import { createValidationContext } from './validation-types.ts';
import { validateGraphStructure } from './graph-integrity.ts';
import { validateDependencyStructure } from './dependency-validation.ts';
import { validateSemanticStructure } from './semantic-validation.ts';
import { validateSymbolStructure } from './symbol-validation.ts';
import { validateRetrievalStructure } from './retrieval-validation.ts';
import { validateMetricsStructure } from './metrics-validation.ts';
import { validateSnapshotReadiness, computeReadinessScore, computeIntegrityScore } from './snapshot-readiness.ts';
import { ValidationSeverity } from '@prodmind/contracts';

export interface ValidationOutput {
  snapshotId: string;
  issues: ValidationIssue[];
  summary: ValidationSummary;
  integrityMetrics: IntegrityMetrics;
  graphResult: GraphValidationResult;
  semanticResult?: SemanticValidationResult;
  retrievalResult?: RetrievalValidationResult;
  snapshotResult: SnapshotValidationResult;
  isValid: boolean;
  generatedAt: string;
}

function buildSummary(issues: ValidationIssue[]): ValidationSummary {
  let criticalCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const issue of issues) {
    switch (issue.severity) {
      case ValidationSeverity.CRITICAL: criticalCount++; break;
      case ValidationSeverity.ERROR: errorCount++; break;
      case ValidationSeverity.WARNING: warningCount++; break;
      case ValidationSeverity.INFO: infoCount++; break;
    }

    byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
  }

  return {
    totalIssues: issues.length,
    criticalCount,
    errorCount,
    warningCount,
    infoCount,
    byCategory,
    bySeverity,
  };
}

function buildIntegrityMetrics(issues: ValidationIssue[]): IntegrityMetrics {
  return {
    integrityScore: computeIntegrityScore(issues),
    readinessScore: computeReadinessScore(issues),
    criticalIssueCount: issues.filter((i) => i.severity === ValidationSeverity.CRITICAL).length,
    errorIssueCount: issues.filter((i) => i.severity === ValidationSeverity.ERROR).length,
    warningIssueCount: issues.filter((i) => i.severity === ValidationSeverity.WARNING).length,
    infoIssueCount: issues.filter((i) => i.severity === ValidationSeverity.INFO).length,
  };
}

export class IntegrityEngine {
  private cachedInput: ValidationInput | null = null;
  private cachedContext: ValidationContext | null = null;

  validate(input: ValidationInput): ValidationOutput {
    const ctx = this.buildContext(input);
    const graphResult = validateGraphStructure(ctx);
    const depIssues = validateDependencyStructure(ctx);
    const semanticIssues = validateSemanticStructure(ctx);
    const symbolIssues = validateSymbolStructure(ctx);
    const retrievalIssues = validateRetrievalStructure(ctx);
    const metricsIssues = validateMetricsStructure(ctx);

    const allIssues = [
      ...graphResult.issues,
      ...depIssues,
      ...semanticIssues,
      ...symbolIssues,
      ...retrievalIssues,
      ...metricsIssues,
    ];

    const snapshotResult = validateSnapshotReadiness(ctx, allIssues);
    const finalIssues = [...allIssues, ...snapshotResult.issues];
    const summary = buildSummary(finalIssues);
    const integrityMetrics = buildIntegrityMetrics(finalIssues);

    return {
      snapshotId: input.snapshotId,
      issues: finalIssues.sort((a, b) => {
        const sevOrder: Record<string, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
        const sevDiff = (sevOrder[a.severity] ?? 99) - (sevOrder[b.severity] ?? 99);
        if (sevDiff !== 0) return sevDiff;
        return a.issueCode.localeCompare(b.issueCode);
      }),
      summary,
      integrityMetrics,
      graphResult,
      semanticResult: { issues: semanticIssues, boundaryViolations: 0, clusterCohesionViolations: 0, namespaceConflicts: 0, crossBoundaryLeaks: 0 },
      retrievalResult: {
        issues: retrievalIssues,
        isDeterministic: retrievalIssues.filter((i) => i.issueCode === 'NON_DETERMINISTIC_TRAVERSAL').length === 0,
        traversalBoundaryValid: retrievalIssues.filter((i) => i.issueCode === 'EXCESSIVE_TRAVERSAL_DEPTH').length === 0,
        orderingStable: retrievalIssues.filter((i) => i.issueCode === 'UNSTABLE_NEIGHBOR_ORDERING').length === 0,
        cacheConsistent: retrievalIssues.filter((i) => i.issueCode.startsWith('CACHE_')).length === 0,
        depthBoundariesValid: true,
      },
      snapshotResult,
      isValid: snapshotResult.validationState === 'VALID' || snapshotResult.validationState === 'DEGRADED',
      generatedAt: new Date().toISOString(),
    };
  }

  validateGraph(input: ValidationInput): GraphValidationResult {
    const ctx = this.buildContext(input);
    return validateGraphStructure(ctx);
  }

  validateSemantic(input: ValidationInput): ValidationIssue[] {
    const ctx = this.buildContext(input);
    return validateSemanticStructure(ctx);
  }

  validateRetrieval(input: ValidationInput): ValidationIssue[] {
    const ctx = this.buildContext(input);
    return validateRetrievalStructure(ctx);
  }

  validateMetrics(input: ValidationInput): ValidationIssue[] {
    const ctx = this.buildContext(input);
    return validateMetricsStructure(ctx);
  }

  validateSnapshot(input: ValidationInput): SnapshotValidationResult {
    const output = this.validate(input);
    return output.snapshotResult;
  }

  private buildContext(input: ValidationInput): ValidationContext {
    if (this.cachedInput && this.cachedContext && this.cachedInput.snapshotId === input.snapshotId) {
      return this.cachedContext;
    }
    const ctx = createValidationContext(input);
    this.cachedInput = input;
    this.cachedContext = ctx;
    return ctx;
  }
}
