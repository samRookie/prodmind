export const TREND_TYPES = [
  'RISK_ACCELERATION', 'COMPLEXITY_GROWTH', 'STABILITY_DEGRADATION',
  'COUPLING_DRIFT', 'PROPAGATION_EXPANSION', 'ARCHITECTURE_FRAGMENTATION',
  'HOTSPOT_CONCENTRATION', 'SCC_DENSIFICATION', 'MAINTAINABILITY_DECLINE',
  'ARCHITECTURE_HEALTH_RECOVERY',
] as const;
export type TrendType = typeof TREND_TYPES[number];

export const TREND_DIRECTIONS = ['IMPROVING', 'DEGRADING', 'STABLE'] as const;
export type TrendDirection = typeof TREND_DIRECTIONS[number];

export interface TrendDataPoint {
  snapshotId: string;
  timestamp: string;
  value: number;
}

export interface ArchitectureTrend {
  trendType: TrendType;
  direction: TrendDirection;
  severity: string;
  fingerprint: string;
  dataPoints: TrendDataPoint[];
  normalizedSeverity: number;
  growthRate: number;
  impactedSystems: string[];
  confidence: number;
  evidenceRefs: { source: string; fingerprint: string; description: string }[];
  metadata: Record<string, unknown>;
}

export interface TimeseriesInput {
  snapshotId: string;
  historicalSnapshots: { id: string; createdAt: string; healthScore?: number; complexity?: { finalScore: number; fragmentationScore: number }; risks?: { riskType: string; severity: string; normalizedScore: number }[]; hotspots?: { nodeId: string; severity: string }[]; patterns?: { patternType: string; severity: string }[]; propagationRisk?: { nodeId: string; propagationPressure: number }[]; instability?: { nodeId: string; instabilityScore: number }[]; couplingDensity?: { globalDensity: number } }[];
}

export interface TimeseriesOutput {
  snapshotId: string;
  trends: ArchitectureTrend[];
  generatedAt: string;
}
