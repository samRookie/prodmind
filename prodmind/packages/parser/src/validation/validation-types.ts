import type { ValidationSeverity, ValidationCategory, ValidationState } from '@prodmind/contracts';
import type { MetricsNode, MetricsEdge, CentralityResult, InstabilityResult, PropagationRiskResult, FanMetricsResult, ComplexityResult } from '../metrics/metrics-types.ts';
import type { ClassificationResult, DomainClusterResult } from '../semantic/types.ts';

export interface ValidationIssue {
  issueCode: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  nodeId: string | null;
  edgeId: string | null;
  metadataJson: string | null;
}

export interface ValidationInput {
  snapshotId: string;
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  classifications?: ClassificationResult[];
  domainClusters?: DomainClusterResult[];
  centrality?: CentralityResult[];
  instability?: InstabilityResult[];
  propagationRisk?: PropagationRiskResult[];
  fanMetrics?: FanMetricsResult[];
  complexity?: ComplexityResult;
  semanticOutput?: {
    infraBusinessResults: Array<{ nodeId: string; filePath: string; dominantRole: string }>;
  };
  retrievalAvailable?: boolean;
  compressionAvailable?: boolean;
}

export interface ValidationSummary {
  totalIssues: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface GraphValidationResult {
  issues: ValidationIssue[];
  isConnected: boolean;
  orphanNodeCount: number;
  duplicateEdgeCount: number;
  duplicateNodeCount: number;
  brokenRegionCount: number;
  cycleCount: number;
}

export interface SemanticValidationResult {
  issues: ValidationIssue[];
  boundaryViolations: number;
  clusterCohesionViolations: number;
  namespaceConflicts: number;
  crossBoundaryLeaks: number;
}

export interface RetrievalValidationResult {
  issues: ValidationIssue[];
  isDeterministic: boolean;
  traversalBoundaryValid: boolean;
  orderingStable: boolean;
  cacheConsistent: boolean;
  depthBoundariesValid: boolean;
}

export interface SnapshotValidationResult {
  issues: ValidationIssue[];
  readinessScore: number;
  integrityScore: number;
  validationState: ValidationState;
  isReady: boolean;
}

export interface IntegrityMetrics {
  integrityScore: number;
  readinessScore: number;
  criticalIssueCount: number;
  errorIssueCount: number;
  warningIssueCount: number;
  infoIssueCount: number;
}

export interface ValidationContext {
  nodeMap: Map<string, MetricsNode>;
  edgeMap: Map<string, MetricsEdge>;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
  adjacencyEdge: Map<string, Map<string, MetricsEdge>>;
  classifications: Map<string, ClassificationResult>;
  domainClusters: DomainClusterResult[];
  centrality: Map<string, CentralityResult>;
  instability: Map<string, InstabilityResult>;
  propagationRisk: Map<string, PropagationRiskResult>;
  fanMetrics: Map<string, FanMetricsResult>;
  complexity?: ComplexityResult;
  snapshotId: string;
}

export function createValidationContext(input: ValidationInput): ValidationContext {
  const nodeMap = new Map<string, MetricsNode>();
  for (const n of input.nodes) nodeMap.set(n.id, n);

  const edgeMap = new Map<string, MetricsEdge>();
  for (const e of input.edges) edgeMap.set(e.id, e);

  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  const adjacencyEdge = new Map<string, Map<string, MetricsEdge>>();

  for (const n of input.nodes) {
    adjacency.set(n.id, []);
    reverseAdjacency.set(n.id, []);
    adjacencyEdge.set(n.id, new Map());
  }

  for (const e of input.edges) {
    const fwd = adjacency.get(e.sourceNodeId);
    if (fwd) fwd.push(e.targetNodeId);

    const rev = reverseAdjacency.get(e.targetNodeId);
    if (rev) rev.push(e.sourceNodeId);

    const edgeMapInner = adjacencyEdge.get(e.sourceNodeId);
    if (edgeMapInner) edgeMapInner.set(e.targetNodeId, e);
  }

  const sortedKeys = (map: Map<string, string[]>) => {
    for (const key of map.keys()) {
      map.set(key, map.get(key)!.sort());
    }
  };
  sortedKeys(adjacency);
  sortedKeys(reverseAdjacency);

  const buildMapById = <T extends { nodeId: string }>(items: T[] | undefined): Map<string, T> => {
    const map = new Map<string, T>();
    if (items) for (const item of items) map.set(item.nodeId, item);
    return map;
  };

  return {
    nodeMap,
    edgeMap,
    adjacency,
    reverseAdjacency,
    adjacencyEdge,
    classifications: buildMapById(input.classifications),
    domainClusters: input.domainClusters ?? [],
    centrality: buildMapById(input.centrality),
    instability: buildMapById(input.instability),
    propagationRisk: buildMapById(input.propagationRisk),
    fanMetrics: buildMapById(input.fanMetrics),
    complexity: input.complexity,
    snapshotId: input.snapshotId,
  };
}
