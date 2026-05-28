export const NARRATIVE_TYPES = [
  'GLOBAL_ARCHITECTURE_SUMMARY', 'RISK_SUMMARY', 'HOTSPOT_SUMMARY',
  'PROPAGATION_SUMMARY', 'STABILITY_SUMMARY', 'COMPLEXITY_SUMMARY',
  'RECOMMENDATION_SUMMARY', 'EXECUTIVE_SUMMARY', 'SUBSYSTEM_SUMMARY',
] as const;
export type NarrativeType = typeof NARRATIVE_TYPES[number];

export const NARRATIVE_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type NarrativeSeverity = typeof NARRATIVE_SEVERITIES[number];

export interface NarrativeEvidenceRef {
  source: string;
  fingerprint: string;
  description: string;
}

export interface NarrativeSection {
  title: string;
  content: string;
  severity: NarrativeSeverity;
  evidenceRefs: NarrativeEvidenceRef[];
  metrics: { metricType: string; metricValue: number }[];
  impactedNodes: string[];
}

export interface Narrative {
  narrativeType: NarrativeType;
  fingerprint: string;
  title: string;
  summary: string;
  severity: NarrativeSeverity;
  severityDistribution: { critical: number; high: number; moderate: number; low: number };
  sections: NarrativeSection[];
  evidenceRefs: NarrativeEvidenceRef[];
  impactedSystems: string[];
  metadata: Record<string, unknown>;
}

export interface NarrativeInput {
  snapshotId: string;
  cognitionSnapshots: { cognitionType: string; fingerprint: string; architectureSummary: string; dominantRisks: { riskType: string; normalizedScore: number; severity: string }[]; dominantPatterns: { patternType: string; confidence: number; severity: string }[]; topRecommendations: { category: string; priority: string; title: string }[]; criticalHotspots: { nodeId: string; severity: string; reason: string }[]; healthScore: { overall: number; label: string }; severityDistribution: { critical: number; high: number; moderate: number; low: number }; confidenceSummary: { overall: number } }[];
  patterns: { patternType: string; isAntiPattern: boolean; severity: string; confidence: number; fingerprint: string; impactedNodes: string[]; title: string; summary: string; metricEvidence: { metricType: string; metricValue: number }[] }[];
  risks: { riskType: string; severity: string; normalizedScore: number; fingerprint: string; title: string; summary: string; impactedNodes: string[] }[];
  recommendations: { category: string; severity: string; priority: string; priorityScore: number; fingerprint: string; title: string; summary: string; impactedNodes: string[] }[];
  insights: { type: string; severity: string; fingerprint: string; title: string; summary: string; evidence: { nodeId?: string; description: string }[] }[];
  couplingDensity: { globalDensity: number; clusterDensities: { clusterName: string; density: number; nodeCount: number }[] };
  complexity: { finalScore: number; complexityLevel: string; fragmentationScore: number };
  propagationRisk: { nodeId: string; propagationPressure: number; blastRadiusAmplification: number }[];
  instability: { nodeId: string; instabilityScore: number; instabilityLevel: string }[];
}

export interface NarrativeOutput {
  snapshotId: string;
  narratives: Narrative[];
  generatedAt: string;
}
