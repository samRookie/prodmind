export const INSIGHT_CATEGORIES = [
  'HOTSPOT',
  'INSTABILITY',
  'DEPTH',
  'PROPAGATION',
  'COUPLING',
  'ARCHITECTURE',
  'COMPLEXITY',
  'FRAGMENTATION',
] as const;

export type InsightCategory = typeof INSIGHT_CATEGORIES[number];

export const INSIGHT_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;

export type InsightSeverity = typeof INSIGHT_SEVERITIES[number];

export const INSIGHT_SCOPES = ['GLOBAL', 'NODE', 'CLUSTER', 'EDGE'] as const;

export type InsightScope = typeof INSIGHT_SCOPES[number];

export interface EvidenceRef {
  nodeId?: string;
  edgeId?: string;
  metricType?: string;
  metricValue?: number;
  description: string;
}

export interface Insight {
  type: InsightCategory;
  severity: InsightSeverity;
  scope: InsightScope;
  fingerprint: string;
  title: string;
  summary: string;
  evidence: EvidenceRef[];
  metadata: Record<string, unknown>;
}

export interface InsightInput {
  snapshotId: string;
  nodes: { id: string; filePath: string; nodeType: string; symbolName: string; language: string }[];
  edges: { id: string; sourceNodeId: string; targetNodeId: string; edgeType: string; weight: number }[];
  semanticClassifications?: { nodeId: string; semanticType: string; ruleStrength: string }[];
  sccData: {
    componentCount: number;
    componentMap: Map<string, number>;
    condensationDAG: Map<number, number[]>;
    componentNodes: Map<number, string[]>;
  };
  centrality: { nodeId: string; inDegree: number; outDegree: number; reachabilityCount: number; dependencyInfluenceScore: number; isUtilityHub: boolean }[];
  fanMetrics: { nodeId: string; fanIn: number; fanOut: number; concentration: number; fanLevel: string; isUtilityHotspot: boolean; isGodModule: boolean }[];
  instability: { nodeId: string; instabilityScore: number; instabilityLevel: string; isUnstableInfrastructure: boolean; isVolatileCore: boolean; hasInversionRisk: boolean }[];
  propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number; cascadeEstimate: number; isChokePoint: boolean }[];
  depth: { maxDepth: number; averageDepth: number; hasExcessivelyDeepChains: boolean; layeringViolations: { sourceId: string; targetId: string; reason: string }[] };
  complexity: { finalScore: number; complexityLevel: string; densityScore: number; entropyScore: number; fragmentationScore: number; cycleScore: number; depthScore: number; edgeNodeRatio: number; sccDensity: number; architecturalEntropy: number; graphFragmentation: number };
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
}

export interface InsightOutput {
  snapshotId: string;
  insights: Insight[];
  generatedAt: string;
}
