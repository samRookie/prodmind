import type { InsightCategory, InsightSeverity, InsightScope } from '../insights/insight-types.ts';

export type MetricOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';

export type ConditionType =
  | 'METRIC_THRESHOLD'
  | 'GRAPH_PREDICATE'
  | 'SEMANTIC_PREDICATE'
  | 'SCC_PREDICATE'
  | 'TOPOLOGY_PREDICATE';

export interface MetricThresholdCondition {
  type: 'METRIC_THRESHOLD';
  metricType: string;
  operator: MetricOperator;
  value: number;
  scope?: string;
}

export interface GraphPredicateCondition {
  type: 'GRAPH_PREDICATE';
  predicate: string;
  params?: Record<string, unknown>;
}

export interface SemanticPredicateCondition {
  type: 'SEMANTIC_PREDICATE';
  predicate: string;
  semanticType: string;
  minStrength?: number;
}

export interface SCCPredicateCondition {
  type: 'SCC_PREDICATE';
  predicate: string;
  minComponentSize?: number;
}

export interface TopologyPredicateCondition {
  type: 'TOPOLOGY_PREDICATE';
  predicate: string;
  params?: Record<string, unknown>;
}

export type RuleCondition =
  | MetricThresholdCondition
  | GraphPredicateCondition
  | SemanticPredicateCondition
  | SCCPredicateCondition
  | TopologyPredicateCondition;

export interface InsightTemplate {
  type: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  titleTemplate: string;
  summaryTemplate: string;
  metadataTemplate?: Record<string, string>;
}

export interface EvidenceTemplate {
  nodeId?: string;
  edgeId?: string;
  metricType?: string;
  metricValue?: number;
  descriptionTemplate: string;
}

export interface RuleAction {
  type: 'EMIT_INSIGHT';
  insight: InsightTemplate;
  evidence: EvidenceTemplate[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  priority: number;
  category: InsightCategory;
  conditions: RuleCondition[];
  action: RuleAction;
}

export interface RuleEvaluationContext {
  snapshotId: string;
  nodes: { id: string; filePath: string; nodeType: string; symbolName: string; language: string }[];
  edges: { id: string; sourceNodeId: string; targetNodeId: string; edgeType: string; weight: number }[];
  metrics: {
    centrality: { nodeId: string; inDegree: number; outDegree: number; reachabilityCount: number; dependencyInfluenceScore: number; isUtilityHub: boolean }[];
    fanMetrics: { nodeId: string; fanIn: number; fanOut: number; concentration: number; fanLevel: string; isUtilityHotspot: boolean; isGodModule: boolean }[];
    instability: { nodeId: string; instabilityScore: number; instabilityLevel: string; isUnstableInfrastructure: boolean; isVolatileCore: boolean; hasInversionRisk: boolean }[];
    propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number; cascadeEstimate: number; isChokePoint: boolean }[];
  };
  sccData: {
    componentCount: number;
    componentMap: Map<string, number>;
    condensationDAG: Map<number, number[]>;
    componentNodes: Map<number, string[]>;
  };
  semanticClassifications?: { nodeId: string; semanticType: string; ruleStrength: string }[];
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
  depth: { maxDepth: number; averageDepth: number; hasExcessivelyDeepChains: boolean; layeringViolations: { sourceId: string; targetId: string; reason: string }[] };
  complexity: { finalScore: number; complexityLevel: string; densityScore: number; entropyScore: number; fragmentationScore: number; cycleScore: number; depthScore: number; edgeNodeRatio: number; sccDensity: number; architecturalEntropy: number; graphFragmentation: number };
}

export interface RuleFinding {
  ruleId: string;
  ruleName: string;
  category: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  title: string;
  summary: string;
  evidence: { nodeId?: string; edgeId?: string; metricType?: string; metricValue?: number; description: string }[];
  metadata: Record<string, unknown>;
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  findings: RuleFinding[];
  executionTimeMs: number;
}

export interface RuleEngineOutput {
  snapshotId: string;
  results: RuleExecutionResult[];
  totalTriggered: number;
  totalFindings: number;
}
