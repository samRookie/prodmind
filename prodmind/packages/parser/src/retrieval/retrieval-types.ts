import type { RetrievalScope, RetrievalStrategy, RetrievalOrdering, SemanticType } from '@prodmind/contracts';
import type { MetricsNode, MetricsEdge, CentralityResult, InstabilityResult, PropagationRiskResult, FanMetricsResult } from '../metrics/metrics-types.ts';
import type { ClassificationResult } from '../semantic/types.ts';

export interface RetrievalQuery {
  snapshotId: string;
  strategy: RetrievalStrategy;
  scope: RetrievalScope;
  seedNodeIds?: string[];
  seedSymbolNames?: string[];
  semanticTypes?: SemanticType[];
  clusterNames?: string[];
  maxDepth?: number;
  maxResults?: number;
  ordering?: RetrievalOrdering;
  includeMetrics?: boolean;
  includeSemantic?: boolean;
}

export interface RetrievedNode {
  nodeId: string;
  filePath: string;
  depth: number;
  nodeType: string;
  language: string | null;
  symbolName: string | null;
  centralityScore: number | null;
  instabilityScore: number | null;
  propagationRiskScore: number | null;
  fanIn: number | null;
  fanOut: number | null;
  semanticType: SemanticType | null;
  classification: string | null;
}

export interface RetrievedEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  weight: number | null;
  metadataJson: string | null;
}

export interface RetrievalContext {
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
  nodeMap: Map<string, MetricsNode>;
  edgeMap: Map<string, MetricsEdge>;
  semanticMap: Map<string, ClassificationResult>;
  centralityMap: Map<string, CentralityResult>;
  instabilityMap: Map<string, InstabilityResult>;
  propagationRiskMap: Map<string, PropagationRiskResult>;
  fanMetricsMap: Map<string, FanMetricsResult>;
  namespaceMap: Map<string, string[]>;
  symbolNamespaceMap: Map<string, string>;
  symbolOwnershipMap: Map<string, string[]>;
  sortedNodeIds: string[];
}

export interface RetrievalMetadata {
  snapshotId: string;
  strategy: RetrievalStrategy;
  scope: RetrievalScope;
  maxDepth: number;
  maxResults: number;
  ordering: RetrievalOrdering;
  generatedAt: string;
}

export interface RetrievalStats {
  totalNodes: number;
  totalEdges: number;
  distinctDepthLevels: number;
  uniqueSemanticTypes: number;
  uniqueNamespaces: number;
  propagationPathsFound: number;
}

export interface RetrievalResult {
  metadata: RetrievalMetadata;
  nodes: RetrievedNode[];
  edges: RetrievedEdge[];
  stats: RetrievalStats;
}

export interface NeighborhoodResult {
  nodes: RetrievedNode[];
  edges: RetrievedEdge[];
  depthLevels: Map<number, string[]>;
  maxDepthReached: number;
}

export interface BlastRadiusResult {
  entryPoint: RetrievedNode;
  forwardImpacts: RetrievedNode[];
  backwardImpacts: RetrievedNode[];
  criticalPaths: Array<{ source: string; target: string; riskScore: number }>;
  totalAffected: number;
}

export interface ArchitecturalSliceResult {
  sliceType: 'infrastructure' | 'business' | 'cluster';
  nodes: RetrievedNode[];
  edges: RetrievedEdge[];
  clusters: string[];
  semanticTypes: SemanticType[];
}

export interface SymbolNeighborhoodResult {
  symbolName: string;
  owningNodes: RetrievedNode[];
  dependentNodes: RetrievedNode[];
  crossModuleReferences: Array<{ sourceNodeId: string; targetNodeId: string; symbolName: string }>;
}
