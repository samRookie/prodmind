export type InsightCategory =
  | 'architectural-risk'
  | 'instability'
  | 'dependency-risk'
  | 'propagation-risk'
  | 'complexity'
  | 'anti-pattern'
  | 'drift'
  | 'hotspot'
  | 'scalability-risk'
  | 'semantic-boundary-risk'
  | 'layering-violation'
  | 'cyclic-risk'
  | 'governance-risk'
  | 'risk';

export type InsightSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type InsightStatus = 'active' | 'resolved' | 'mitigated' | 'dismissed';

export interface InsightId {
  id: string;
  fingerprint: string;
}

export interface InsightEvidence {
  id: string;
  insightId: string;
  type: 'graph' | 'metric' | 'traversal' | 'semantic' | 'replay';
  source: string;
  description: string;
  data: Record<string, unknown>;
  timestamp: string;
  fingerprint: string;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  status: InsightStatus;
  title: string;
  description: string;
  summary: string;
  fingerprint: string;
  context: InsightContext;
  evidence: InsightEvidence[];
  scores: InsightScores;
  timestamp: string;
  expiration: string | null;
  sourceGraphSnapshot: string | null;
  remediationIds: string[];
  relatedInsightIds: string[];
}

export interface InsightContext {
  nodeIds: string[];
  edgeIds: string[];
  traversalIds: string[];
  metricKeys: string[];
  semanticRegionIds: string[];
  snapshotIds: string[];
}

export interface InsightScores {
  overall: number;
  confidence: number;
  severity: number;
  impact: number;
  urgency: number;
  complexity: number;
}

export interface AntiPatternResult {
  id: string;
  pattern: string;
  severity: InsightSeverity;
  confidence: number;
  description: string;
  nodes: string[];
  edges: string[];
  metrics: Record<string, number>;
  evidence: InsightEvidence[];
}

export interface SmellResult {
  id: string;
  smell: string;
  severity: InsightSeverity;
  confidence: number;
  description: string;
  affectedNodes: string[];
  affectedEdges: string[];
  metrics: Record<string, number>;
}

export interface RiskInterpretation {
  id: string;
  riskType: string;
  severity: InsightSeverity;
  confidence: number;
  description: string;
  blastRadius: string[];
  cascadeProbability: number;
  impactScore: number;
  affectedNodes: string[];
}

export interface HotspotIntelligence {
  id: string;
  hotspotType: string;
  nodeId: string;
  intensity: number;
  ranking: number;
  risk: number;
  description: string;
  clusterIds: string[];
  metrics: Record<string, number>;
}

export interface ComplexityInsight {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: InsightSeverity;
  description: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  regions: string[];
}

export interface PropagationIntelligence {
  id: string;
  propagationType: string;
  sourceNodeId: string;
  blastRadius: number;
  cascadeRisk: number;
  influenceScore: number;
  affectedNodes: string[];
  chainDepth: number;
}

export interface RemediationPlan {
  id: string;
  insightId: string;
  strategy: string;
  priority: InsightSeverity;
  steps: RemediationStep[];
  impact: RemediationImpact;
  estimatedEffort: string;
  graphEvidence: Record<string, unknown>;
}

export interface RemediationStep {
  order: number;
  action: string;
  targetNodes: string[];
  description: string;
  risk: string;
}

export interface RemediationImpact {
  riskReduction: number;
  complexityReduction: number;
  couplingReduction: number;
  stabilityImprovement: number;
}

export interface DriftReport {
  id: string;
  driftType: string;
  severity: InsightSeverity;
  description: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  changes: DriftChange[];
  metrics: Record<string, number>;
}

export interface DriftChange {
  type: 'added' | 'removed' | 'modified';
  nodeId: string;
  metric: string;
  oldValue: number;
  newValue: number;
}

export interface Explanation {
  insightId: string;
  summary: string;
  reasoning: ReasoningStep[];
  evidenceSummary: string;
  graphContext: string;
  confidence: number;
  deterministic: boolean;
}

export interface ReasoningStep {
  order: number;
  premise: string;
  evidence: string;
  conclusion: string;
}

export interface ScoringConfig {
  confidenceWeight: number;
  severityWeight: number;
  impactWeight: number;
  urgencyWeight: number;
  complexityWeight: number;
}

export interface ReplayValidationResult {
  insightId: string;
  replayId: string;
  deterministic: boolean;
  matchScore: number;
  diffs: string[];
}

export interface InsightTelemetry {
  insightId: string;
  computationTime: number;
  evidenceCount: number;
  nodesAnalyzed: number;
  edgesAnalyzed: number;
  memoryEstimate: number;
}

export interface InsightQuery {
  categories?: InsightCategory[];
  severities?: InsightSeverity[];
  statuses?: InsightStatus[];
  minConfidence?: number;
  minSeverity?: number;
  maxResults?: number;
  nodeIds?: string[];
  before?: string;
  after?: string;
}
