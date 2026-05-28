export const COGNITION_TYPES = ['GLOBAL', 'SUBSYSTEM', 'CLUSTER', 'NODE'] as const;
export type CognitionType = typeof COGNITION_TYPES[number];

export interface EvidenceReference {
  source: string;
  fingerprint: string;
  description: string;
}

export interface HealthScoreDetails {
  overall: number;
  label: string;
  complexity: number;
  instability: number;
  propagationRisk: number;
  sccDensity: number;
  fragmentation: number;
  antiPatternDensity: number;
  recommendationSeverity: number;
  architectureDepth: number;
}

export interface CognitionSnapshot {
  cognitionType: CognitionType;
  fingerprint: string;
  architectureSummary: string;
  dominantRisks: { riskType: string; normalizedScore: number; severity: string }[];
  dominantPatterns: { patternType: string; confidence: number; severity: string }[];
  topRecommendations: { category: string; priority: string; priorityScore: number; title: string }[];
  criticalHotspots: { nodeId: string; severity: string; reason: string }[];
  evidenceReferences: EvidenceReference[];
  confidenceSummary: { overall: number; insightConfidence: number; patternConfidence: number; riskConfidence: number; recommendationConfidence: number };
  severityDistribution: { critical: number; high: number; moderate: number; low: number };
  healthScore: HealthScoreDetails;
  metadata: Record<string, unknown>;
}

export interface CognitionInput {
  snapshotId: string;
  insights: { type: string; severity: string; fingerprint: string; title: string; summary: string; evidence: { nodeId?: string; description: string }[] }[];
  patterns: { patternType: string; isAntiPattern: boolean; severity: string; confidence: number; fingerprint: string; impactedNodes: string[]; metricEvidence: { metricType: string; metricValue: number }[] }[];
  risks: { riskType: string; severity: string; normalizedScore: number; fingerprint: string; impactedNodes: string[] }[];
  recommendations: { category: string; severity: string; priority: string; priorityScore: number; fingerprint: string; title: string; summary: string; impactedNodes: string[]; evidenceRefs: { insightFingerprint?: string; patternFingerprint?: string; riskFingerprint?: string; description: string }[] }[];
  centrality: { nodeId: string; inDegree: number; outDegree: number; dependencyInfluenceScore: number }[];
  fanMetrics: { nodeId: string; fanIn: number; fanOut: number; concentration: number }[];
  instability: { nodeId: string; instabilityScore: number; instabilityLevel: string }[];
  propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number }[];
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[]; edgeConcentration: number };
  complexity: { finalScore: number; complexityLevel: string; densityScore: number; entropyScore: number; fragmentationScore: number; cycleScore: number; depthScore: number; sccDensity: number; architecturalEntropy: number; graphFragmentation: number };
}

export interface CognitionOutput {
  snapshotId: string;
  snapshots: CognitionSnapshot[];
  generatedAt: string;
}
