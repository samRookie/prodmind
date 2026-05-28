export const INDEX_TYPES = [
  'NODE_INDEX', 'EDGE_INDEX', 'SCC_INDEX', 'HOTSPOT_INDEX',
  'RISK_INDEX', 'PATTERN_INDEX', 'RECOMMENDATION_INDEX',
  'COGNITION_INDEX', 'TEMPORAL_INDEX', 'NAMESPACE_INDEX',
  'SUBSYSTEM_INDEX', 'NARRATIVE_INDEX', 'TREND_INDEX',
] as const;
export type IndexType = typeof INDEX_TYPES[number];

export interface CognitionIndex {
  indexType: IndexType;
  fingerprint: string;
  entries: IndexEntry[];
  builtAt: string;
}

export interface IndexEntry {
  id: string;
  key: string;
  value: unknown;
  fingerprint: string;
}

export interface NodeIndexEntry {
  nodeId: string;
  name: string;
  type: string;
  subsystem?: string;
  namespace?: string;
  fingerprints: { insight?: string; evidence?: string; pattern?: string };
}

export interface EdgeIndexEntry {
  edgeId: string;
  sourceId: string;
  targetId: string;
  type: string;
}

export interface SccIndexEntry {
  sccId: string;
  nodeIds: string[];
  size: number;
}

export interface HotspotIndexEntry {
  nodeId: string;
  severity: string;
  reason: string;
  impactedNodes: string[];
}

export interface RiskIndexEntry {
  riskId: string;
  riskType: string;
  severity: string;
  normalizedScore: number;
  impactedNodes: string[];
}

export interface PatternIndexEntry {
  patternId: string;
  patternType: string;
  severity: string;
  impactedNodes: string[];
}

export interface RecommendationIndexEntry {
  recommendationId: string;
  category: string;
  priority: string;
  title: string;
  impactedNodes: string[];
}

export interface CognitionIndexEntry {
  cognitionId: string;
  cognitionType: string;
  fingerprint: string;
}

export interface TemporalIndexEntry {
  snapshotId: string;
  timestamp: string;
  metrics: Record<string, number>;
}

export interface NamespaceIndexEntry {
  namespace: string;
  nodeIds: string[];
}

export interface SubsystemIndexEntry {
  subsystem: string;
  nodeIds: string[];
}

export interface IndexBuildInput {
  nodes?: { id: string; type: string; name: string; subsystem?: string; namespace?: string }[];
  edges?: { id?: string; sourceId: string; targetId: string; type: string }[];
  sccs?: { id: string; nodes: string[] }[];
  hotspots?: { nodeId: string; severity: string; reason: string; impactedNodes?: string[] }[];
  risks?: { id?: string; riskType: string; severity: string; normalizedScore: number; impactedNodes: string[] }[];
  patterns?: { id?: string; patternType: string; severity: string; impactedNodes: string[] }[];
  recommendations?: { id?: string; category: string; priority: string; title: string; impactedNodes: string[] }[];
  cognitions?: { id?: string; cognitionType: string; fingerprint: string }[];
  narratives?: { id?: string; narrativeType: string; fingerprint: string }[];
  trends?: { trendType: string; direction: string; fingerprint: string }[];
}
