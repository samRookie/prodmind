export const RECOMMENDATION_CATEGORIES = [
  'REFACTORING', 'DECOUPLING', 'LAYERING', 'MODULARIZATION',
  'STABILITY', 'PERFORMANCE', 'PROPAGATION_REDUCTION',
  'COMPLEXITY_REDUCTION', 'DEPENDENCY_ISOLATION', 'BOUNDARY_ENFORCEMENT',
] as const;
export type RecommendationCategory = typeof RECOMMENDATION_CATEGORIES[number];

export const RECOMMENDATION_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type RecommendationSeverity = typeof RECOMMENDATION_SEVERITIES[number];

export const RECOMMENDATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE'] as const;
export type RecommendationPriority = typeof RECOMMENDATION_PRIORITIES[number];

export interface RecommendationEvidenceRef {
  insightFingerprint?: string;
  ruleId?: string;
  patternFingerprint?: string;
  riskFingerprint?: string;
  nodeIds?: string[];
  edgeIds?: string[];
  metricType?: string;
  metricValue?: number;
  description: string;
}

export interface RemediationStrategy {
  templateId: string;
  strategy: string;
  description: string;
  parameters: Record<string, unknown>;
  expectedImpact: string;
}

export interface Recommendation {
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  priority: RecommendationPriority;
  priorityScore: number;
  fingerprint: string;
  title: string;
  summary: string;
  rationale: string;
  impactedNodes: string[];
  impactedSubsystems: string[];
  evidenceRefs: RecommendationEvidenceRef[];
  remediation: RemediationStrategy;
  metadata: Record<string, unknown>;
}

export interface RecommendationInput {
  snapshotId: string;
  insights: { type: string; severity: string; scope: string; fingerprint: string; title: string; summary: string; evidence: { nodeId?: string; edgeId?: string; metricType?: string; metricValue?: number; description: string }[]; metadata: Record<string, unknown> }[];
  rules?: { ruleId: string; ruleName: string; findings: { severity: string; title: string; summary: string; evidence: { nodeId?: string; description: string }[]; metadata: Record<string, unknown> }[] }[];
  patterns?: { patternType: string; confidence: number; severity: string; fingerprint: string; title: string; summary: string; impactedNodes: string[]; evidence: { description: string }[] }[];
  risks?: { riskType: string; normalizedScore: number; severity: string; fingerprint: string; impactedNodes: string[] }[];
  centrality?: { nodeId: string; inDegree: number; outDegree: number; dependencyInfluenceScore: number; isUtilityHub: boolean }[];
  fanMetrics?: { nodeId: string; fanIn: number; fanOut: number; concentration: number; isUtilityHotspot: boolean; isGodModule: boolean }[];
  instability?: { nodeId: string; instabilityScore: number; instabilityLevel: string }[];
  propagationRisk?: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number; cascadeEstimate: number; isChokePoint: boolean }[];
  sccData?: { componentCount: number; componentMap: Map<string, number>; condensationDAG: Map<number, number[]>; componentNodes: Map<number, string[]> };
  couplingDensity?: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
  complexity?: { finalScore: number; complexityLevel: string };
}

export interface RecommendationOutput {
  snapshotId: string;
  recommendations: Recommendation[];
  generatedAt: string;
}
