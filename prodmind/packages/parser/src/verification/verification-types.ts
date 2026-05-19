import type { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';

export interface VerificationIssue {
  issueCode: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  nodeId: string | null;
  edgeId: string | null;
  metadataJson: string | null;
  remediationHint: string | null;
}

export interface VerificationSummary {
  graphIntegrityScore: number;
  semanticConsistencyScore: number;
  retrievalStabilityScore: number;
  metricsStabilityScore: number;
  dependencyHealthScore: number;
  overallSystemScore: number;
}

export interface PerformanceMetrics {
  ingestionTimeMs: number;
  validationTimeMs: number;
  retrievalBenchmarkMs: number;
  metricsComputationMs: number;
}

export interface DeterminismFlags {
  graphDeterministic: boolean;
  retrievalDeterministic: boolean;
  metricsDeterministic: boolean;
  semanticDeterministic: boolean;
}

export interface SystemHealth {
  hasOrphanNodes: boolean;
  hasBrokenEdges: boolean;
  hasInvalidSymbols: boolean;
  hasSemanticLeaks: boolean;
  hasMetricCorruption: boolean;
}

export interface RemediationSummary {
  autoFixableCount: number;
  codeFixRequiredCount: number;
  architecturalObservationCount: number;
  suggestedActions: string[];
}

export type VerificationStatus = 'PASS' | 'DEGRADED' | 'FAIL';

export interface VerificationReport {
  snapshotId: string;
  status: VerificationStatus;
  summary: VerificationSummary;
  criticalIssues: VerificationIssue[];
  warnings: VerificationIssue[];
  info: VerificationIssue[];
  performance: PerformanceMetrics;
  determinism: DeterminismFlags;
  systemHealth: SystemHealth;
  remediationSummary: RemediationSummary;
  generatedAt: string;
}

export const REMEDIATION_HINTS: Record<string, string> = {
  ORPHAN_NODE: 'Node has no edges. Remove the node or add edges to integrate it into the graph.',
  DUPLICATE_EDGE: 'Duplicate edge detected. Deduplicate edges before validation.',
  DUPLICATE_NODE: 'Duplicate node detected. Remove duplicate nodes before validation.',
  CYCLE_DETECTED: 'Circular dependency detected. Break the cycle by restructuring dependencies.',
  EDGE_SELF_REFERENCE: 'Edge references itself. Remove or correct the self-referencing edge.',
  NODE_REF_MISSING_SOURCE: 'Edge references a source node that does not exist. Check edge definitions.',
  NODE_REF_MISSING_TARGET: 'Edge references a target node that does not exist. Check edge definitions.',
  DISCONNECTED_REGIONS: 'Graph has disconnected regions. Ensure all nodes are reachable.',
  GRAPH_NOT_FULLY_CONNECTED: 'Graph is not fully connected. Connect isolated subgraphs.',

  BROKEN_IMPORT_TARGET: 'Import references a non-existent file. Check the import path.',
  CIRCULAR_DEPENDENCY: 'Circular dependency between modules. Extract shared logic into a separate module.',
  DEPTH_LIMIT_EXCEEDED: 'Dependency chain exceeds depth limit. Flatten the dependency hierarchy.',
  ALIAS_RESOLUTION_FAILURE: 'Path alias could not be resolved. Check tsconfig paths configuration.',
  RE_EXPORT_CHAIN_TOO_LONG: 'Re-export chain exceeds limit. Re-export directly from the source module.',

  CROSS_BOUNDARY_LEAK: 'Infrastructure module depends on business logic. Remove direct dependency, introduce an abstraction layer.',
  MISSING_CLASSIFICATION: 'Node lacks semantic classification. Re-run semantic classification pipeline.',
  BOUNDARY_CONSISTENCY_VIOLATION: 'Module path does not match its semantic role. Rename or reclassify the module.',
  CLUSTER_COHESION_LOW: 'Cluster cohesion is below threshold. Re-evaluate cluster boundaries.',
  NAMESPACE_CONFLICT: 'Multiple semantic types within the same namespace. Split namespaces by layer.',
  SEMANTIC_ISOLATION_VIOLATION: 'Semantic layer isolation breached. Restrict cross-layer dependencies.',

  DUPLICATE_SYMBOL_OWNERSHIP: 'Symbol owned by multiple nodes. Resolve ambiguous symbol resolution.',
  UNRESOLVED_SYMBOL: 'Imported symbol not found in any file. Check the export exists.',
  SYMBOL_NAMESPACE_MISMATCH: 'Symbol name does not match its file namespace. Rename symbol or move to correct file.',
  CROSS_MODULE_SYMBOL_USAGE: 'Same symbol referenced across modules without explicit export. Add proper exports.',

  NON_DETERMINISTIC_TRAVERSAL: 'Retrieval non-deterministic. Fix code: ensure stable sort and deterministic iteration order.',
  EXCESSIVE_TRAVERSAL_DEPTH: 'Traversal depth exceeds bound. Limit maxDepth in retrieval query.',
  UNSTABLE_NEIGHBOR_ORDERING: 'Neighbor ordering is unstable across runs. Fix code: apply stable sort after traversal.',
  BLAST_RADIUS_TOO_LARGE: 'Blast radius exceeds safe threshold. Reduce query scope or add depth limits.',
  CACHE_INCONSISTENCY: 'Retrieval cache is inconsistent with graph data. Rebuild the cache.',

  METRIC_NAN: 'Metrics produced NaN value. Check for division by zero or empty graph conditions.',
  METRIC_INFINITY: 'Metrics produced Infinity value. Check for overflow in computation.',
  CENTRALITY_MISMATCH: 'Centrality degree count does not match adjacency. Recompute centrality.',
  INSTABILITY_OUT_OF_RANGE: 'Instability score outside 0-1 range. Check instability computation.',
  COMPLEXITY_SCORE_INVALID: 'Complexity sub-score exceeds expected range. Verify complexity algorithm.',
  PROPAGATION_SCORE_INVALID: 'Propagation risk score outside 0-1 range. Check propagation computation.',
};

export const REMEDIATION_CATEGORIES: Record<string, 'auto-fixable' | 'code-fix' | 'architectural'> = {
  ORPHAN_NODE: 'auto-fixable',
  DUPLICATE_EDGE: 'auto-fixable',
  DUPLICATE_NODE: 'auto-fixable',
  CYCLE_DETECTED: 'architectural',
  EDGE_SELF_REFERENCE: 'auto-fixable',
  NODE_REF_MISSING_SOURCE: 'auto-fixable',
  NODE_REF_MISSING_TARGET: 'auto-fixable',
  DISCONNECTED_REGIONS: 'architectural',
  GRAPH_NOT_FULLY_CONNECTED: 'architectural',

  BROKEN_IMPORT_TARGET: 'auto-fixable',
  CIRCULAR_DEPENDENCY: 'architectural',
  DEPTH_LIMIT_EXCEEDED: 'architectural',
  ALIAS_RESOLUTION_FAILURE: 'auto-fixable',
  RE_EXPORT_CHAIN_TOO_LONG: 'architectural',

  CROSS_BOUNDARY_LEAK: 'architectural',
  MISSING_CLASSIFICATION: 'auto-fixable',
  BOUNDARY_CONSISTENCY_VIOLATION: 'architectural',
  CLUSTER_COHESION_LOW: 'architectural',
  NAMESPACE_CONFLICT: 'architectural',
  SEMANTIC_ISOLATION_VIOLATION: 'architectural',

  DUPLICATE_SYMBOL_OWNERSHIP: 'auto-fixable',
  UNRESOLVED_SYMBOL: 'auto-fixable',
  SYMBOL_NAMESPACE_MISMATCH: 'architectural',
  CROSS_MODULE_SYMBOL_USAGE: 'architectural',

  NON_DETERMINISTIC_TRAVERSAL: 'code-fix',
  EXCESSIVE_TRAVERSAL_DEPTH: 'code-fix',
  UNSTABLE_NEIGHBOR_ORDERING: 'code-fix',
  BLAST_RADIUS_TOO_LARGE: 'code-fix',
  CACHE_INCONSISTENCY: 'code-fix',

  METRIC_NAN: 'code-fix',
  METRIC_INFINITY: 'code-fix',
  CENTRALITY_MISMATCH: 'code-fix',
  INSTABILITY_OUT_OF_RANGE: 'code-fix',
  COMPLEXITY_SCORE_INVALID: 'code-fix',
  PROPAGATION_SCORE_INVALID: 'code-fix',
};
