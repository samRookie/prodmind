import { z } from 'zod';

export const temporalSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  timestamp: z.string(),
  label: z.string(),
  fingerprint: z.string(),
  metadata: z.record(z.unknown()),
  nodeCount: z.number(),
  edgeCount: z.number(),
});

export const graphDeltaSchema = z.object({
  addedNodes: z.number(),
  removedNodes: z.number(),
  addedEdges: z.number(),
  removedEdges: z.number(),
  nodeCountChange: z.number(),
  edgeCountChange: z.number(),
  complexityDelta: z.number(),
  instabilityDelta: z.number(),
  couplingDelta: z.number(),
  propagationDelta: z.number(),
});

export const metricPointSchema = z.object({
  timestamp: z.string(),
  value: z.number(),
});

export const metricTrajectorySchema = z.object({
  metricName: z.string(),
  points: z.array(metricPointSchema),
  slope: z.number(),
  acceleration: z.number(),
  volatility: z.number(),
  trend: z.enum(['increasing', 'decreasing', 'stable', 'volatile']),
});

export const forecastWindowSchema = z.object({
  startTimestamp: z.string(),
  endTimestamp: z.string(),
  projectionCount: z.number(),
  confidenceThreshold: z.number().min(0).max(1),
  bounds: z.object({ lower: z.number(), upper: z.number() }),
});

export const boundedPredictionSchema = z.object({
  metricName: z.string(),
  currentValue: z.number(),
  predictedValue: z.number(),
  lowerBound: z.number(),
  upperBound: z.number(),
  confidence: z.number().min(0).max(1),
  horizonMs: z.number(),
});

export const temporalEvidenceSchema = z.object({
  type: z.string(),
  description: z.string(),
  snapshotIds: z.array(z.string()),
  metricValues: z.record(z.number()),
  trajectorySlope: z.number(),
  confidence: z.number().min(0).max(1),
});

export const forecastResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  forecastWindow: forecastWindowSchema,
  predictions: z.array(boundedPredictionSchema),
  evidence: z.array(temporalEvidenceSchema),
  confidence: z.number().min(0).max(1),
  fingerprint: z.string(),
});

export const trajectoryResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  metricTrajectories: z.array(metricTrajectorySchema),
  degradationVelocity: z.number(),
  instabilityAcceleration: z.number(),
  hotspotGrowthRate: z.number(),
});

export const simulationStepSchema = z.object({
  stepIndex: z.number(),
  simulatedTimestamp: z.string(),
  predictedValues: z.record(z.number()),
  confidence: z.number().min(0).max(1),
});

export const simulationResultSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  createdAt: z.string(),
  scenarioName: z.string(),
  steps: z.array(simulationStepSchema),
  bounds: forecastWindowSchema,
  fingerprint: z.string(),
});

export const degradationPointSchema = z.object({
  snapshotId: z.string(),
  timestamp: z.string(),
  erosionScore: z.number(),
  fragmentationScore: z.number(),
  fatigueScore: z.number(),
  instabilityAccumulation: z.number(),
  decayAcceleration: z.number(),
});

export const hotspotEvolutionPointSchema = z.object({
  timestamp: z.string(),
  hotspotId: z.string(),
  modulePath: z.string(),
  intensity: z.number(),
  riskScore: z.number(),
  affectedModules: z.number(),
});

export const remediationRecordSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  timestamp: z.string(),
  targetModule: z.string(),
  actionType: z.string(),
  description: z.string(),
  successScore: z.number(),
  impactScore: z.number(),
  regressionScore: z.number(),
});
