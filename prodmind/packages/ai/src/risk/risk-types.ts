export const RISK_TYPES = [
  'ARCHITECTURAL_COLLAPSE_RISK', 'CASCADE_FAILURE_RISK', 'MAINTAINABILITY_RISK',
  'CHANGE_AMPLIFICATION_RISK', 'COUPLING_RISK', 'STABILITY_RISK',
  'COMPLEXITY_RISK', 'FRAGMENTATION_RISK', 'SCALABILITY_RISK', 'EVOLUTION_RISK',
] as const;
export type RiskType = typeof RISK_TYPES[number];

export const RISK_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type RiskSeverity = typeof RISK_SEVERITIES[number];

export interface RiskCorrelation {
  riskType: RiskType;
  severity: RiskSeverity;
  normalizedScore: number;
  fingerprint: string;
  title: string;
  summary: string;
  impactedNodes: string[];
  impactedSubsystems: string[];
  insightFingerprints: string[];
  patternFingerprints: string[];
  evidenceRefs: { source: string; description: string }[];
  metadata: Record<string, unknown>;
}

export interface RiskInput {
  snapshotId: string;
  insights: { type: string; severity: string; fingerprint: string; title: string; summary: string; evidence: { nodeId?: string; description: string }[]; metadata: Record<string, unknown> }[];
  patterns: { patternType: string; isAntiPattern: boolean; severity: string; confidence: number; fingerprint: string; impactedNodes: string[]; metricEvidence: { metricType: string; metricValue: number }[]; metadata: Record<string, unknown> }[];
  centrality: { nodeId: string; inDegree: number; outDegree: number; dependencyInfluenceScore: number; isUtilityHub: boolean }[];
  fanMetrics: { nodeId: string; fanIn: number; fanOut: number; concentration: number; isUtilityHotspot: boolean; isGodModule: boolean }[];
  instability: { nodeId: string; instabilityScore: number; instabilityLevel: string; isUnstableInfrastructure: boolean; isVolatileCore: boolean; hasInversionRisk: boolean }[];
  propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number; cascadeEstimate: number; isChokePoint: boolean }[];
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
  complexity: { finalScore: number; complexityLevel: string; densityScore: number; entropyScore: number; fragmentationScore: number; cycleScore: number; depthScore: number; edgeNodeRatio: number; sccDensity: number; architecturalEntropy: number; graphFragmentation: number };
}

export interface RiskOutput {
  snapshotId: string;
  correlations: RiskCorrelation[];
  generatedAt: string;
}
