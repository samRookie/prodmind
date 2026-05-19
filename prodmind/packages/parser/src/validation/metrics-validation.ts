import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue } from './validation-types.ts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.METRICS, message, nodeId, edgeId: null, metadataJson: null };
}

export function validateMetricRanges(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [nodeId, c] of ctx.centrality) {
    if (!isFiniteNumber(c.dependencyInfluenceScore)) {
      issues.push(makeIssue('INVALID_CENTRALITY', ValidationSeverity.CRITICAL,
        `Centrality for ${nodeId} has invalid dependencyInfluenceScore: ${c.dependencyInfluenceScore}`, nodeId));
    }
    if (c.dependencyInfluenceScore < 0 || c.dependencyInfluenceScore > 1) {
      issues.push(makeIssue('CENTRALITY_OUT_OF_RANGE', ValidationSeverity.ERROR,
        `Centrality for ${nodeId} has dependencyInfluenceScore ${c.dependencyInfluenceScore} (expected 0-1)`, nodeId));
    }
  }

  for (const [nodeId, i] of ctx.instability) {
    if (!isFiniteNumber(i.instabilityScore)) {
      issues.push(makeIssue('INVALID_INSTABILITY', ValidationSeverity.CRITICAL,
        `Instability for ${nodeId} has invalid score: ${i.instabilityScore}`, nodeId));
    }
    if (i.instabilityScore < 0 || i.instabilityScore > 1) {
      issues.push(makeIssue('INSTABILITY_OUT_OF_RANGE', ValidationSeverity.ERROR,
        `Instability for ${nodeId} has score ${i.instabilityScore} (expected 0-1)`, nodeId));
    }
  }

  for (const [nodeId, r] of ctx.propagationRisk) {
    if (!isFiniteNumber(r.propagationPressure)) {
      issues.push(makeIssue('INVALID_PROPAGATION_RISK', ValidationSeverity.CRITICAL,
        `Propagation risk for ${nodeId} has invalid propagationPressure: ${r.propagationPressure}`, nodeId));
    }
    if (r.propagationPressure < 0 || r.propagationPressure > 1) {
      issues.push(makeIssue('PROPAGATION_OUT_OF_RANGE', ValidationSeverity.ERROR,
        `Propagation risk for ${nodeId} has propagationPressure ${r.propagationPressure} (expected 0-1)`, nodeId));
    }
  }

  for (const [nodeId, f] of ctx.fanMetrics) {
    if (!isFiniteNumber(f.fanIn) || !isFiniteNumber(f.fanOut)) {
      issues.push(makeIssue('INVALID_FAN_METRIC', ValidationSeverity.CRITICAL,
        `Fan metrics for ${nodeId} has invalid value: fanIn=${f.fanIn}, fanOut=${f.fanOut}`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

function isFiniteNumber(v: number): boolean {
  return typeof v === 'number' && isFinite(v) && !isNaN(v);
}

export function validateCentralityConsistency(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [nodeId, c] of ctx.centrality) {
    const node = ctx.nodeMap.get(nodeId);
    if (!node) {
      issues.push(makeIssue('CENTRALITY_ORPHAN', ValidationSeverity.ERROR,
        `Centrality result for non-existent node ${nodeId}`, nodeId));
      continue;
    }

    const fwd = ctx.adjacency.get(nodeId) ?? [];
    const rev = ctx.reverseAdjacency.get(nodeId) ?? [];

    if (c.outDegree !== fwd.length) {
      issues.push(makeIssue('CENTRALITY_OUTDEGREE_MISMATCH', ValidationSeverity.WARNING,
        `Centrality outDegree ${c.outDegree} does not match adjacency count ${fwd.length} for ${nodeId}`, nodeId));
    }

    if (c.inDegree !== rev.length) {
      issues.push(makeIssue('CENTRALITY_INDEGREE_MISMATCH', ValidationSeverity.WARNING,
        `Centrality inDegree ${c.inDegree} does not match reverse adjacency count ${rev.length} for ${nodeId}`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateInstabilityScores(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [nodeId, i] of ctx.instability) {
    const fwd = ctx.adjacency.get(nodeId) ?? [];
    const rev = ctx.reverseAdjacency.get(nodeId) ?? [];

    if (fwd.length === 0 && rev.length === 0 && i.instabilityScore !== 0) {
      issues.push(makeIssue('INSTABILITY_ISOLATED_NODE', ValidationSeverity.INFO,
        `Isolated node ${nodeId} has non-zero instability ${i.instabilityScore}`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateComplexityScores(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const c = ctx.complexity;
  if (!c) return issues;

  if (!isFiniteNumber(c.finalScore)) {
    issues.push(makeIssue('INVALID_COMPLEXITY', ValidationSeverity.CRITICAL,
      `Complexity finalScore is invalid: ${c.finalScore}`));
  }

  if (c.finalScore < 0 || c.finalScore > 1) {
    issues.push(makeIssue('COMPLEXITY_OUT_OF_RANGE', ValidationSeverity.ERROR,
      `Complexity finalScore ${c.finalScore} outside expected range 0-1`));
  }

  for (const [field, value] of Object.entries({
    densityScore: c.densityScore, entropyScore: c.entropyScore,
    fragmentationScore: c.fragmentationScore, cycleScore: c.cycleScore,
    depthScore: c.depthScore,
  })) {
    if (!isFiniteNumber(value)) {
      issues.push(makeIssue(`INVALID_COMPLEXITY_${field.toUpperCase()}`, ValidationSeverity.CRITICAL,
        `Complexity ${field} is invalid: ${value}`));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validatePropagationScores(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [nodeId, r] of ctx.propagationRisk) {
    if (!isFiniteNumber(r.cascadeEstimate) || r.cascadeEstimate < 0) {
      issues.push(makeIssue('INVALID_CASCADE_ESTIMATE', ValidationSeverity.ERROR,
        `Propagation risk for ${nodeId} has invalid cascadeEstimate: ${r.cascadeEstimate}`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateMetricsStructure(ctx: ValidationContext): ValidationIssue[] {
  return [
    ...validateMetricRanges(ctx),
    ...validateCentralityConsistency(ctx),
    ...validateInstabilityScores(ctx),
    ...validateComplexityScores(ctx),
    ...validatePropagationScores(ctx),
  ];
}
