export const ARCHITECTURE_PATTERNS = [
  'LAYERED', 'MODULAR', 'PIPELINE', 'HUB_AND_SPOKE',
  'SERVICE_CLUSTER', 'DOMAIN_GROUPING', 'SHARED_CORE', 'BOUNDED_CONTEXT',
] as const;
export type ArchitecturePattern = typeof ARCHITECTURE_PATTERNS[number];

export const ANTI_PATTERNS = [
  'GOD_MODULE', 'DEPENDENCY_MESH', 'CYCLIC_CLUSTER', 'PROPAGATION_HUB',
  'UTILITY_GRAVITY_WELL', 'LAYER_LEAKAGE', 'UNSTABLE_CORE', 'ARCHITECTURAL_FRAGMENTATION',
] as const;
export type AntiPattern = typeof ANTI_PATTERNS[number];

export const PATTERN_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type PatternSeverity = typeof PATTERN_SEVERITIES[number];

export interface TopologyEvidence {
  nodeIds: string[];
  edgeCount: number;
  subgraphDensity: number;
  description: string;
}

export interface SCCEvidence {
  componentId: number;
  componentSize: number;
  memberNodes: string[];
}

export interface MetricEvidence {
  metricType: string;
  metricValue: number;
  description: string;
}

export interface PatternDetection {
  patternType: ArchitecturePattern | AntiPattern;
  isAntiPattern: boolean;
  severity: PatternSeverity;
  confidence: number;
  fingerprint: string;
  title: string;
  summary: string;
  impactedNodes: string[];
  impactedClusters: string[];
  topologyEvidence: TopologyEvidence[];
  sccEvidence: SCCEvidence[];
  metricEvidence: MetricEvidence[];
  metadata: Record<string, unknown>;
}

export interface PatternInput {
  snapshotId: string;
  nodes: { id: string; filePath: string; nodeType: string; symbolName: string; language: string }[];
  edges: { id: string; sourceNodeId: string; targetNodeId: string; edgeType: string; weight: number }[];
  sccData: { componentCount: number; componentMap: Map<string, number>; condensationDAG: Map<number, number[]>; componentNodes: Map<number, string[]> };
  centrality: { nodeId: string; inDegree: number; outDegree: number; reachabilityCount: number; dependencyInfluenceScore: number; isUtilityHub: boolean }[];
  fanMetrics: { nodeId: string; fanIn: number; fanOut: number; concentration: number; fanLevel: string; isUtilityHotspot: boolean; isGodModule: boolean }[];
  instability: { nodeId: string; instabilityScore: number; instabilityLevel: string; isUnstableInfrastructure: boolean; isVolatileCore: boolean; hasInversionRisk: boolean }[];
  propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number; cascadeEstimate: number; isChokePoint: boolean }[];
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
  complexity: { finalScore: number; complexityLevel: string; densityScore: number; entropyScore: number; fragmentationScore: number; cycleScore: number; depthScore: number; sccDensity: number };
}

export interface PatternOutput {
  snapshotId: string;
  detections: PatternDetection[];
  generatedAt: string;
}
