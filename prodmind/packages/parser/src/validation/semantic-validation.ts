import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue } from './validation-types.ts';
import { SemanticType } from '@prodmind/contracts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.SEMANTIC, message, nodeId, edgeId: null, metadataJson: null };
}

export function validateSemanticClassification(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const nodeId of ctx.nodeMap.keys()) {
    const cls = ctx.classifications.get(nodeId);
    if (!cls) {
      issues.push(makeIssue('MISSING_CLASSIFICATION', ValidationSeverity.WARNING,
        `Node ${nodeId} (${ctx.nodeMap.get(nodeId)?.filePath ?? ''}) has no semantic classification`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateBoundaryConsistency(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const nodeId of ctx.nodeMap.keys()) {
    const cls = ctx.classifications.get(nodeId);
    if (!cls) continue;

    const node = ctx.nodeMap.get(nodeId);
    if (!node) continue;

    const filePath = node.filePath.replace(/\\/g, '/');

    if (cls.semanticType === SemanticType.INFRASTRUCTURE && filePath.includes('/business/')) {
      issues.push(makeIssue('BOUNDARY_MISMATCH', ValidationSeverity.WARNING,
        `Node ${nodeId} classified as INFRASTRUCTURE but in /business/ path: ${filePath}`, nodeId));
    }

    if (cls.semanticType === SemanticType.DOMAIN_LAYER && filePath.includes('/infra/')) {
      issues.push(makeIssue('BOUNDARY_MISMATCH', ValidationSeverity.WARNING,
        `Node ${nodeId} classified as DOMAIN_LAYER but in /infra/ path: ${filePath}`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateClusterIntegrity(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const cluster of ctx.domainClusters) {
    if (cluster.cohesionScore < 0.3) {
      for (const nodeId of cluster.nodeIds) {
        issues.push(makeIssue('LOW_CLUSTER_COHESION', ValidationSeverity.WARNING,
          `Cluster ${cluster.clusterName} has low cohesion score ${cluster.cohesionScore.toFixed(2)} for node ${nodeId}`, nodeId));
      }
    }

    if (cluster.fragmentationScore > 0.7) {
      issues.push(makeIssue('FRAGMENTED_CLUSTER', ValidationSeverity.WARNING,
        `Cluster ${cluster.clusterName} has high fragmentation score ${cluster.fragmentationScore.toFixed(2)}`,
        cluster.nodeIds[0] ?? null));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateNamespaceOwnership(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const namespaceMap = new Map<string, string[]>();

  for (const nodeId of ctx.nodeMap.keys()) {
    const node = ctx.nodeMap.get(nodeId);
    if (!node) continue;

    const normalized = node.filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    const existing = namespaceMap.get(namespace) ?? [];
    existing.push(nodeId);
    namespaceMap.set(namespace, existing);
  }

  for (const [namespace, nodeIds] of namespaceMap) {
    const types = new Set<string>();
    for (const nid of nodeIds) {
      const cls = ctx.classifications.get(nid);
      if (cls) types.add(cls.semanticType);
    }

    if (types.size > 2) {
      issues.push(makeIssue('NAMESPACE_TYPE_MIX', ValidationSeverity.INFO,
        `Namespace ${namespace} contains ${types.size} different semantic types: ${[...types].join(', ')}`,
        nodeIds[0] ?? null));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateSemanticIsolation(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const edge of ctx.edgeMap.values()) {
    const sourceCls = ctx.classifications.get(edge.sourceNodeId);
    const targetCls = ctx.classifications.get(edge.targetNodeId);

    if (!sourceCls || !targetCls) continue;

    if (sourceCls.semanticType === SemanticType.INFRASTRUCTURE &&
        targetCls.semanticType === SemanticType.DOMAIN_LAYER) {
      issues.push(makeIssue('INFRA_TO_BUSINESS_EDGE', ValidationSeverity.WARNING,
        `Infrastructure node ${edge.sourceNodeId} depends on business domain node ${edge.targetNodeId}`,
        edge.sourceNodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateCrossBoundaryLeaks(ctx: ValidationContext): ValidationIssue[] {
  return validateSemanticIsolation(ctx);
}

export function validateSemanticStructure(ctx: ValidationContext): ValidationIssue[] {
  return [
    ...validateSemanticClassification(ctx),
    ...validateBoundaryConsistency(ctx),
    ...validateClusterIntegrity(ctx),
    ...validateNamespaceOwnership(ctx),
    ...validateCrossBoundaryLeaks(ctx),
  ];
}
