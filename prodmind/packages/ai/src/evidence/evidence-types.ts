import type { InsightCategory, InsightSeverity, InsightScope } from '../insights/insight-types.ts';

export interface GraphNodeRef {
  nodeId: string;
  filePath?: string;
  nodeType?: string;
}

export interface GraphEdgeRef {
  edgeId: string;
  sourceNodeId?: string;
  targetNodeId?: string;
}

export interface MetricRef {
  metricType: string;
  metricValue: number;
  metricScope?: string;
}

export interface SCCRef {
  componentId: number;
  nodeCount: number;
  nodes?: string[];
}

export interface SemanticRef {
  semanticType: string;
  ruleStrength: string;
  nodeId?: string;
}

export interface RuleTriggerRef {
  ruleId: string;
  ruleName: string;
}

export interface TopologyChainRef {
  chainPath: string[];
  chainDepth: number;
}

export interface PropagationPathRef {
  sourceNodeId: string;
  affectedNodes: string[];
  cascadeFactor: number;
}

export interface EvidencePayload {
  category: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  insightFingerprint: string;
  title: string;
  summary: string;
  graphNodes: GraphNodeRef[];
  graphEdges: GraphEdgeRef[];
  metrics: MetricRef[];
  sccs: SCCRef[];
  semanticClassifications: SemanticRef[];
  ruleTriggers: RuleTriggerRef[];
  topologyChains: TopologyChainRef[];
  propagationPaths: PropagationPathRef[];
  summaryText: string;
  supportingData: Record<string, unknown>;
}

export interface EvidenceRecord {
  id: string;
  snapshotId: string;
  insightFingerprint: string;
  payload: EvidencePayload;
  linkedAt: string;
}

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EvidenceLinkingInput {
  insightFingerprint: string;
  insightCategory: InsightCategory;
  insightSeverity: InsightSeverity;
  insightScope: InsightScope;
  insightTitle: string;
  insightSummary: string;
  evidence: { nodeId?: string; edgeId?: string; metricType?: string; metricValue?: number; description: string }[];
  snapshotId: string;
  graphNodes: { id: string; filePath: string; nodeType: string }[];
  graphEdges: { id: string; sourceNodeId: string; targetNodeId: string }[];
  metrics: { nodeId?: string; metricType: string; metricValue: number; metricScope?: string }[];
  sccData: {
    componentCount: number;
    componentMap: Map<string, number>;
    componentNodes: Map<number, string[]>;
  };
  semanticClassifications?: { nodeId: string; semanticType: string; ruleStrength: string }[];
  ruleTriggers?: { ruleId: string; ruleName: string }[];
  propagationPaths?: { sourceNodeId: string; affectedNodes: string[]; cascadeFactor: number }[];
  topologyChains?: { chainPath: string[]; chainDepth: number }[];
}

export interface EvidenceEngineOutput {
  snapshotId: string;
  records: EvidenceRecord[];
  totalLinked: number;
  validationResult: EvidenceValidationResult;
}
