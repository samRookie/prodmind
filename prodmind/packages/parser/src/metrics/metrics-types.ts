import type { FanLevel, InstabilityLevel, ComplexityLevel, MetricType, MetricScope, MetricPriority } from '@prodmind/contracts';
import type { ClassificationResult } from '../semantic/types.ts';

export interface MetricsNode {
  id: string;
  filePath: string;
  fileHash: string | null;
  nodeType: string;
  symbolName: string | null;
  language: string | null;
  metadataJson: string | null;
}

export interface MetricsEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  weight: number | null;
  metadataJson: string | null;
}

export interface MetricsInput {
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  snapshotId: string;
  semanticClassifications?: ClassificationResult[];
}

export interface CentralityResult {
  nodeId: string;
  filePath: string;
  inDegree: number;
  outDegree: number;
  reachabilityCount: number;
  dependencyInfluenceScore: number;
  isUtilityHub: boolean;
}

export interface FanMetricsResult {
  nodeId: string;
  filePath: string;
  fanIn: number;
  fanOut: number;
  concentration: number;
  fanLevel: FanLevel;
  isUtilityHotspot: boolean;
  isGodModule: boolean;
}

export interface CouplingDensityResult {
  globalDensity: number;
  clusterDensities: Array<{ clusterName: string; density: number; nodeCount: number }>;
  edgeConcentration: number;
  internalVsExternalRatios: Array<{ nodeId: string; filePath: string; internalRatio: number; externalRatio: number }>;
}

export interface InstabilityResult {
  nodeId: string;
  filePath: string;
  instabilityScore: number;
  instabilityLevel: InstabilityLevel;
  isUnstableInfrastructure: boolean;
  isVolatileCore: boolean;
  hasInversionRisk: boolean;
}

export interface PropagationRiskResult {
  nodeId: string;
  filePath: string;
  propagationPressure: number;
  blastRadiusAmplification: number;
  cascadeEstimate: number;
  isChokePoint: boolean;
}

export interface DepthResult {
  maxDepth: number;
  averageDepth: number;
  chainLengths: number[];
  deepestChains: Array<{ source: string; target: string; length: number }>;
  depthDistribution: Array<{ range: string; count: number }>;
  hasExcessivelyDeepChains: boolean;
  layeringViolations: Array<{ sourceId: string; targetId: string; reason: string }>;
}

export interface ComplexityResult {
  densityScore: number;
  entropyScore: number;
  fragmentationScore: number;
  cycleScore: number;
  depthScore: number;
  finalScore: number;
  complexityLevel: ComplexityLevel;
  edgeNodeRatio: number;
  sccDensity: number;
  graphFragmentation: number;
  architecturalEntropy: number;
}

export interface MetricsOutput {
  snapshotId: string;
  centrality: CentralityResult[];
  fanMetrics: FanMetricsResult[];
  couplingDensity: CouplingDensityResult;
  instability: InstabilityResult[];
  propagationRisk: PropagationRiskResult[];
  depth: DepthResult;
  complexity: ComplexityResult;
  records: MetricRecord[];
  generatedAt: string;
}

export interface MetricRecord {
  metricType: MetricType;
  metricScope: MetricScope;
  nodeId: string | null;
  metricValue: number;
  metricClassification: string | null;
  metricPriority: MetricPriority;
  metadataJson: string | null;
}
