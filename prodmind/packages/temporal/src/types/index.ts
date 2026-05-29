export interface TemporalSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  label: string;
  fingerprint: string;
  metadata: Record<string, unknown>;
  nodeCount: number;
  edgeCount: number;
}

export interface TemporalWindow {
  startSnapshotId: string;
  endSnapshotId: string;
  startTimestamp: string;
  endTimestamp: string;
  snapshotCount: number;
  intervalMs: number;
}

export interface GraphDelta {
  addedNodes: number;
  removedNodes: number;
  addedEdges: number;
  removedEdges: number;
  nodeCountChange: number;
  edgeCountChange: number;
  complexityDelta: number;
  instabilityDelta: number;
  couplingDelta: number;
  propagationDelta: number;
}

export interface EvolutionPoint {
  snapshotId: string;
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
  complexity: number;
  instability: number;
  coupling: number;
  propagation: number;
  hotspotCount: number;
  semanticScore: number;
  driftScore: number;
}

export interface MetricTrajectory {
  metricName: string;
  points: Array<{ timestamp: string; value: number }>;
  slope: number;
  acceleration: number;
  volatility: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
}

export interface DegradationPoint {
  snapshotId: string;
  timestamp: string;
  erosionScore: number;
  fragmentationScore: number;
  fatigueScore: number;
  instabilityAccumulation: number;
  decayAcceleration: number;
}

export interface ForecastWindow {
  startTimestamp: string;
  endTimestamp: string;
  projectionCount: number;
  confidenceThreshold: number;
  bounds: { lower: number; upper: number };
}

export interface BoundedPrediction {
  metricName: string;
  currentValue: number;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  horizonMs: number;
}

export interface TrendPoint {
  timestamp: string;
  value: number;
  movingAverage: number;
  deviation: number;
}

export interface HotspotEvolutionPoint {
  timestamp: string;
  hotspotId: string;
  modulePath: string;
  intensity: number;
  riskScore: number;
  affectedModules: number;
}

export interface RemediationRecord {
  id: string;
  snapshotId: string;
  timestamp: string;
  targetModule: string;
  actionType: string;
  description: string;
  successScore: number;
  impactScore: number;
  regressionScore: number;
}

export interface TemporalEvidence {
  type: string;
  description: string;
  snapshotIds: string[];
  metricValues: Record<string, number>;
  trajectorySlope: number;
  confidence: number;
}

export interface ForecastResult {
  id: string;
  projectId: string;
  createdAt: string;
  forecastWindow: ForecastWindow;
  predictions: BoundedPrediction[];
  evidence: TemporalEvidence[];
  confidence: number;
  fingerprint: string;
}

export interface TrajectoryResult {
  id: string;
  projectId: string;
  createdAt: string;
  metricTrajectories: MetricTrajectory[];
  degradationVelocity: number;
  instabilityAcceleration: number;
  hotspotGrowthRate: number;
}

export interface SimulationResult {
  id: string;
  projectId: string;
  createdAt: string;
  scenarioName: string;
  steps: SimulationStep[];
  bounds: ForecastWindow;
  fingerprint: string;
}

export interface SimulationStep {
  stepIndex: number;
  simulatedTimestamp: string;
  predictedValues: Record<string, number>;
  confidence: number;
}
