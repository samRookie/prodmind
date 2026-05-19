import type { SemanticType, CouplingType, RuleStrength } from '@prodmind/contracts';
import type { ParseResult } from '../types/ast.types.ts';
import type { ResolutionResult } from '../resolution/resolution-types.ts';

export interface ClassificationHeuristic {
  ruleName: string;
  pattern: string;
  matched: boolean;
}

export interface ClassificationResult {
  nodeId: string;
  filePath: string;
  semanticType: SemanticType;
  ruleStrength: RuleStrength;
  classificationReasons: string[];
  matchedHeuristics: ClassificationHeuristic[];
}

export interface InfraBusinessResult {
  nodeId: string;
  filePath: string;
  infraScore: number;
  businessScore: number;
  dominantRole: 'infrastructure' | 'business' | 'balanced';
  supportingHeuristics: string[];
}

export interface DomainClusterResult {
  clusterId: string;
  snapshotId: string;
  clusterName: string;
  nodeIds: string[];
  cohesionScore: number;
  fragmentationScore: number;
  boundaryMetadataJson: string | null;
}

export interface CouplingEdgeResult {
  id: string;
  snapshotId: string;
  sourceNodeId: string;
  targetNodeId: string;
  couplingType: CouplingType;
  couplingStrength: number;
  propagationRisk: number;
  metadataJson: string | null;
}

export interface SemanticInput {
  parseResults: ParseResult[];
  resolution?: ResolutionResult;
  nodes: Array<{
    id: string;
    filePath: string;
    fileHash: string | null;
    nodeType: string;
    symbolName: string | null;
    language: string | null;
    metadataJson: string | null;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: string;
    weight: number | null;
    metadataJson: string | null;
  }>;
  fileHashes: Map<string, string>;
  snapshotId: string;
}

export interface SemanticOutput {
  snapshotId: string;
  classifications: ClassificationResult[];
  infraBusinessResults: InfraBusinessResult[];
  domainClusters: DomainClusterResult[];
  couplingEdges: CouplingEdgeResult[];
  generatedAt: string;
}
