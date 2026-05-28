export const DIFF_TYPES = [
  'NODE_ADDED', 'NODE_REMOVED', 'EDGE_ADDED', 'EDGE_REMOVED',
  'SCC_EXPANDED', 'SCC_REDUCED', 'RISK_INCREASED', 'RISK_REDUCED',
  'COMPLEXITY_INCREASED', 'COMPLEXITY_REDUCED', 'HOTSPOT_EMERGED', 'HOTSPOT_RESOLVED',
  'PROPAGATION_EXPANDED', 'ARCHITECTURE_FRAGMENTED', 'HEALTH_IMPROVED', 'HEALTH_DEGRADED',
] as const;
export type DiffType = typeof DIFF_TYPES[number];

export const DIFF_SEVERITIES = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const;
export type DiffSeverity = typeof DIFF_SEVERITIES[number];

export interface DiffEvidence {
  metricType: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  description: string;
}

export interface ArchitectureDiff {
  diffType: DiffType;
  severity: DiffSeverity;
  fingerprint: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  impactedNodes: string[];
  impactedClusters: string[];
  impactedRisks: string[];
  impactedPatterns: string[];
  evidence: DiffEvidence[];
  metadata: Record<string, unknown>;
}

export interface DiffInput {
  previousSnapshotId: string;
  currentSnapshotId: string;
  previousNodes?: { id: string }[];
  currentNodes?: { id: string }[];
  previousEdges?: { id: string; sourceNodeId: string; targetNodeId: string }[];
  currentEdges?: { id: string; sourceNodeId: string; targetNodeId: string }[];
  previousSccData?: { componentCount: number; componentNodes: Map<number, string[]> };
  currentSccData?: { componentCount: number; componentNodes: Map<number, string[]> };
  previousRisks?: { riskType: string; severity: string; normalizedScore: number; impactedNodes: string[] }[];
  currentRisks?: { riskType: string; severity: string; normalizedScore: number; impactedNodes: string[] }[];
  previousPatterns?: { patternType: string; severity: string; impactedNodes: string[] }[];
  currentPatterns?: { patternType: string; severity: string; impactedNodes: string[] }[];
  previousHotspots?: { nodeId: string; severity: string }[];
  currentHotspots?: { nodeId: string; severity: string }[];
  previousComplexity?: { finalScore: number; fragmentationScore: number };
  currentComplexity?: { finalScore: number; fragmentationScore: number };
  previousPropagation?: { nodeId: string; propagationPressure: number }[];
  currentPropagation?: { nodeId: string; propagationPressure: number }[];
  previousHealthScore?: number;
  currentHealthScore?: number;
}

export interface DiffOutput {
  previousSnapshotId: string;
  currentSnapshotId: string;
  diffs: ArchitectureDiff[];
  generatedAt: string;
}

export interface SnapshotPair {
  previous: { id: string };
  current: { id: string };
}
