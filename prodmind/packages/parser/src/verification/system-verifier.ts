import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationInput, ValidationContext, ValidationIssue as CoreValidationIssue, GraphValidationResult } from '../validation/validation-types.ts';
import { createValidationContext } from '../validation/validation-types.ts';
import { validateGraphStructure } from '../validation/graph-integrity.ts';
import { validateDependencyStructure } from '../validation/dependency-validation.ts';
import { validateSemanticStructure } from '../validation/semantic-validation.ts';
import { validateSymbolStructure } from '../validation/symbol-validation.ts';
import { validateRetrievalStructure } from '../validation/retrieval-validation.ts';
import { validateMetricsStructure } from '../validation/metrics-validation.ts';
import { IntegrityEngine } from '../validation/integrity-engine.ts';
import { computeIntegrityScore } from '../validation/snapshot-readiness.ts';
import type { VerificationReport, VerificationIssue, VerificationStatus, RemediationSummary } from './verification-types.ts';
import { REMEDIATION_HINTS, REMEDIATION_CATEGORIES } from './verification-types.ts';
import { SystemVerificationError } from './verification-errors.ts';

function toVerificationIssue(issue: CoreValidationIssue): VerificationIssue {
  return {
    issueCode: issue.issueCode,
    severity: issue.severity,
    category: issue.category,
    message: issue.message,
    nodeId: issue.nodeId,
    edgeId: issue.edgeId,
    metadataJson: issue.metadataJson,
    remediationHint: REMEDIATION_HINTS[issue.issueCode] ?? null,
  };
}

function categorizeRemediation(issues: VerificationIssue[]): RemediationSummary {
  let autoFixableCount = 0;
  let codeFixRequiredCount = 0;
  let architecturalObservationCount = 0;
  const suggestedActions = new Set<string>();

  for (const issue of issues) {
    const cat = REMEDIATION_CATEGORIES[issue.issueCode];
    if (cat === 'auto-fixable') {
      autoFixableCount++;
      if (issue.remediationHint) suggestedActions.add(issue.remediationHint);
    } else if (cat === 'code-fix') {
      codeFixRequiredCount++;
      if (issue.remediationHint) suggestedActions.add(issue.remediationHint);
    } else {
      architecturalObservationCount++;
      if (issue.remediationHint) suggestedActions.add(issue.remediationHint);
    }
  }

  return {
    autoFixableCount,
    codeFixRequiredCount,
    architecturalObservationCount,
    suggestedActions: [...suggestedActions].slice(0, 10),
  };
}

function isCritical(issue: CoreValidationIssue): boolean {
  return issue.severity === ValidationSeverity.CRITICAL;
}

function isWarning(issue: CoreValidationIssue): boolean {
  return issue.severity === ValidationSeverity.WARNING;
}

function isInfo(issue: CoreValidationIssue): boolean {
  return issue.severity === ValidationSeverity.INFO;
}

function hasNaNOrInfinity(values: number[]): boolean {
  return values.some((v) => !Number.isFinite(v));
}

export class Phase4SystemVerifier {
  private readonly integrityEngine = new IntegrityEngine();

  verifyFullSystem(snapshotId: string, input: ValidationInput): VerificationReport {
    if (input.snapshotId !== snapshotId) {
      throw new SystemVerificationError(`Snapshot ID mismatch: expected ${snapshotId}, got ${input.snapshotId}`);
    }

    const ctx = createValidationContext(input);
    const startTime = performance.now();

    const allIssues: CoreValidationIssue[] = [];
    const criticalIssues: VerificationIssue[] = [];
    const warnings: VerificationIssue[] = [];
    const info: VerificationIssue[] = [];
    let graphResult: GraphValidationResult | null = null;

    // Phase 1: Graph Integrity Validation
    graphResult = validateGraphStructure(ctx);
    allIssues.push(...graphResult.issues);
    for (const issue of graphResult.issues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }

    const graphIntegrityScore = computeIntegrityScore(graphResult.issues);
    if (criticalIssues.length > 0 || graphIntegrityScore < 0.90) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, 0, 0, 0, 0, startTime, graphResult);
    }

    // Phase 2: Dependency Resolution Validation
    const depIssues = validateDependencyStructure(ctx);
    allIssues.push(...depIssues);
    for (const issue of depIssues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }
    if (criticalIssues.length > 0) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, 0, 0, 0, 0, startTime, graphResult);
    }

    const dependencyHealthScore = computeIntegrityScore(depIssues);

    // Phase 3: Semantic Graph Validation
    const semanticIssues = validateSemanticStructure(ctx);
    allIssues.push(...semanticIssues);
    for (const issue of semanticIssues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }
    if (criticalIssues.length > 0) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, 0, 0, 0, dependencyHealthScore, startTime, graphResult);
    }

    const semanticConsistencyScore = computeIntegrityScore(semanticIssues);

    // Phase 4: Symbol Ownership Validation
    const symbolIssues = validateSymbolStructure(ctx);
    allIssues.push(...symbolIssues);
    for (const issue of symbolIssues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }
    if (criticalIssues.length > 0) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, semanticConsistencyScore, 0, 0, dependencyHealthScore, startTime, graphResult);
    }

    // Phase 5: Retrieval Determinism Validation
    const retrievalIssues = validateRetrievalStructure(ctx);
    allIssues.push(...retrievalIssues);
    for (const issue of retrievalIssues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }
    const hasNonDeterministic = retrievalIssues.some((i) => i.issueCode === 'NON_DETERMINISTIC_TRAVERSAL');
    const retrievalStabilityScore = hasNonDeterministic ? 0 : computeIntegrityScore(retrievalIssues);
    if (criticalIssues.length > 0 || hasNonDeterministic) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, semanticConsistencyScore, retrievalStabilityScore, 0, dependencyHealthScore, startTime, graphResult);
    }

    // Phase 6: Metrics Consistency Validation
    const metricsIssues = validateMetricsStructure(ctx);
    allIssues.push(...metricsIssues);
    for (const issue of metricsIssues) {
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }
    const metricsStabilityScore = computeIntegrityScore(metricsIssues);
    const metricValues: number[] = [];
    if (ctx.centrality) for (const c of ctx.centrality.values()) metricValues.push(c.dependencyInfluenceScore);
    if (ctx.instability) for (const i of ctx.instability.values()) metricValues.push(i.instabilityScore);
    if (ctx.propagationRisk) for (const p of ctx.propagationRisk.values()) metricValues.push(p.propagationPressure);
    const hasMetricCorruption = hasNaNOrInfinity(metricValues);
    if (criticalIssues.length > 0 || hasMetricCorruption) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, semanticConsistencyScore, retrievalStabilityScore, metricsStabilityScore, dependencyHealthScore, startTime, graphResult);
    }

    // Phase 7: Validation Engine (Phase 4.8) — integrated check
    const validationOutput = this.integrityEngine.validate(input);
    for (const issue of validationOutput.issues) {
      if (!allIssues.some((a) => a.issueCode === issue.issueCode && a.nodeId === issue.nodeId)) {
        allIssues.push(issue);
        if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
        else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
        else if (isInfo(issue)) info.push(toVerificationIssue(issue));
      }
    }
    if (criticalIssues.length > 0) {
      return this.buildReport(snapshotId, 'FAIL', input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, semanticConsistencyScore, retrievalStabilityScore, metricsStabilityScore, dependencyHealthScore, startTime, graphResult);
    }

    // Phase 8: Integration Stability Checks (Phase 4.9)
    const integrationIssues = this.runIntegrationChecks(ctx, allIssues);
    for (const issue of integrationIssues) {
      allIssues.push(issue);
      if (isCritical(issue)) criticalIssues.push(toVerificationIssue(issue));
      else if (isWarning(issue)) warnings.push(toVerificationIssue(issue));
      else if (isInfo(issue)) info.push(toVerificationIssue(issue));
    }

    // Determine overall status
    const overallSystemScore = this.computeOverallScore(
      graphIntegrityScore, semanticConsistencyScore,
      retrievalStabilityScore, metricsStabilityScore, dependencyHealthScore,
    );
    const status = this.determineStatus(
      criticalIssues, graphIntegrityScore, semanticConsistencyScore,
      hasNonDeterministic, hasMetricCorruption, warnings,
    );

    return this.buildReport(snapshotId, status, input, ctx, allIssues, criticalIssues, warnings, info, graphIntegrityScore, semanticConsistencyScore, retrievalStabilityScore, metricsStabilityScore, dependencyHealthScore, startTime, graphResult, overallSystemScore);
  }

  private runIntegrationChecks(ctx: ValidationContext, existingIssues: CoreValidationIssue[]): CoreValidationIssue[] {
    const issues: CoreValidationIssue[] = [];

    const nodeCount = ctx.nodeMap.size;
    const edgeCount = ctx.edgeMap.size;

    if (nodeCount > 0 && edgeCount === 0) {
      issues.push({
        issueCode: 'INTEGRATION_NODES_WITHOUT_EDGES',
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.ARCHITECTURE,
        message: `Graph has ${nodeCount} nodes but zero edges — retrieval may return empty results`,
        nodeId: null,
        edgeId: null,
        metadataJson: null,
      });
    }

    const retrievalResult = existingIssues.filter((i) => i.category === ValidationCategory.RETRIEVAL);
    const metricsResult = existingIssues.filter((i) => i.category === ValidationCategory.METRICS);
    if (retrievalResult.length > 0 && metricsResult.length === 0) {
      issues.push({
        issueCode: 'INTEGRATION_METRICS_MISSING_FOR_RETRIEVAL',
        severity: ValidationSeverity.INFO,
        category: ValidationCategory.ARCHITECTURE,
        message: 'Retrieval issues exist but no metrics validation was performed',
        nodeId: null,
        edgeId: null,
        metadataJson: null,
      });
    }

    const classificationCount = ctx.classifications.size;
    const centralityCount = ctx.centrality.size;
    if (classificationCount > 0 && centralityCount === 0) {
      issues.push({
        issueCode: 'INTEGRATION_CLASSIFICATION_WITHOUT_METRICS',
        severity: ValidationSeverity.INFO,
        category: ValidationCategory.ARCHITECTURE,
        message: `Semantic classifications exist (${classificationCount}) but no centrality metrics computed`,
        nodeId: null,
        edgeId: null,
        metadataJson: null,
      });
    }

    issues.sort((a, b) => {
      const sevOrder: Record<string, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
      const sa = sevOrder[a.severity] ?? 99;
      const sb = sevOrder[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.issueCode.localeCompare(b.issueCode);
    });

    return issues;
  }

  private computeOverallScore(
    graphScore: number, semanticScore: number,
    retrievalScore: number, metricsScore: number, depScore: number,
  ): number {
    return (graphScore * 0.25 + depScore * 0.15 + semanticScore * 0.2 + retrievalScore * 0.2 + metricsScore * 0.2);
  }

  private determineStatus(
    criticalIssues: VerificationIssue[],
    graphIntegrityScore: number,
    semanticConsistencyScore: number,
    hasNonDeterministic: boolean,
    hasMetricCorruption: boolean,
    warnings: VerificationIssue[],
  ): VerificationStatus {
    if (criticalIssues.length > 0) return 'FAIL';
    if (graphIntegrityScore < 0.90) return 'FAIL';
    if (hasNonDeterministic) return 'FAIL';
    if (hasMetricCorruption) return 'FAIL';

    if (semanticConsistencyScore < 0.85) return 'DEGRADED';
    if (warnings.length > 0) return 'DEGRADED';

    return 'PASS';
  }

  private buildReport(
    snapshotId: string,
    status: VerificationStatus,
    _input: ValidationInput,
    ctx: ValidationContext,
    allIssues: CoreValidationIssue[],
    criticalIssues: VerificationIssue[],
    warnings: VerificationIssue[],
    info: VerificationIssue[],
    graphIntegrityScore: number,
    semanticConsistencyScore: number,
    retrievalStabilityScore: number,
    metricsStabilityScore: number,
    dependencyHealthScore: number,
    startTime: number,
    graphResult: GraphValidationResult | null,
    overallSystemScore?: number,
  ): VerificationReport {
    const elapsed = performance.now() - startTime;

    const overallScore = overallSystemScore ?? this.computeOverallScore(
      graphIntegrityScore, semanticConsistencyScore,
      retrievalStabilityScore, metricsStabilityScore, dependencyHealthScore,
    );

    const sortedCritical = [...criticalIssues].sort((a, b) => {
      const sevOrder: Record<string, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
      const sa = sevOrder[a.severity] ?? 99;
      const sb = sevOrder[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.issueCode.localeCompare(b.issueCode);
    });

    const sortedWarnings = [...warnings].sort((a, b) => {
      const sevOrder: Record<string, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
      const sa = sevOrder[a.severity] ?? 99;
      const sb = sevOrder[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.issueCode.localeCompare(b.issueCode);
    });

    const sortedInfo = [...info].sort((a, b) => {
      const sevOrder: Record<string, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
      const sa = sevOrder[a.severity] ?? 99;
      const sb = sevOrder[b.severity] ?? 99;
      if (sa !== sb) return sa - sb;
      return a.issueCode.localeCompare(b.issueCode);
    });

    const hasNonDeterministic = allIssues.some((i) => i.issueCode === 'NON_DETERMINISTIC_TRAVERSAL');
    const metricValues: number[] = [];
    if (ctx.centrality) for (const c of ctx.centrality.values()) metricValues.push(c.dependencyInfluenceScore);
    if (ctx.instability) for (const i of ctx.instability.values()) metricValues.push(i.instabilityScore);
    if (ctx.propagationRisk) for (const p of ctx.propagationRisk.values()) metricValues.push(p.propagationPressure);
    const hasMetricCorruption = hasNaNOrInfinity(metricValues);

    const allVerificationIssues = [...sortedCritical, ...sortedWarnings, ...sortedInfo];

    return {
      snapshotId,
      status,
      summary: {
        graphIntegrityScore,
        semanticConsistencyScore,
        retrievalStabilityScore,
        metricsStabilityScore,
        dependencyHealthScore,
        overallSystemScore: overallScore,
      },
      criticalIssues: sortedCritical,
      warnings: sortedWarnings,
      info: sortedInfo,
      performance: {
        ingestionTimeMs: 0,
        validationTimeMs: elapsed,
        retrievalBenchmarkMs: 0,
        metricsComputationMs: 0,
      },
      determinism: {
        graphDeterministic: true,
        retrievalDeterministic: !hasNonDeterministic,
        metricsDeterministic: !hasMetricCorruption,
        semanticDeterministic: true,
      },
      systemHealth: {
        hasOrphanNodes: (graphResult?.orphanNodeCount ?? 0) > 0,
        hasBrokenEdges: allIssues.some((i) => i.issueCode.startsWith('NODE_REF_')),
        hasInvalidSymbols: allIssues.some((i) => i.issueCode === 'UNRESOLVED_SYMBOL' || i.issueCode === 'DUPLICATE_SYMBOL_OWNERSHIP'),
        hasSemanticLeaks: allIssues.some((i) => i.issueCode === 'CROSS_BOUNDARY_LEAK'),
        hasMetricCorruption,
      },
      remediationSummary: categorizeRemediation(allVerificationIssues),
      generatedAt: new Date().toISOString(),
    };
  }
}
