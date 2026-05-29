import { beforeEach,describe, expect, it } from 'vitest';

import type { ReplayAuditCheck } from '../audit/index.ts';
import { auditDegradation, auditDeterminism, auditDeterminismBatch, auditEvidence, auditEvidenceBatch, auditExplainability,auditForecast, auditPrediction, auditPredictions, auditReplayBatch, auditReplayCheck, auditSimulation } from '../audit/index.ts';
import { analyzeArchitecturalFatigue, analyzeErosion, analyzeFragmentation, analyzeInstabilityGrowth, classifyDegradation, DegradationEngine, forecastDegradation,prioritizeDegradation } from '../degradation/index.ts';
import { analyzeArchitectureDriftTrajectory, analyzeDependencyDriftEvolution, analyzeDriftAcceleration, analyzeDriftPersistence, analyzeSemanticDriftEvolution, compareDrifts,computeTemporalDrift } from '../drift/index.ts';
import { TemporalError, TemporalErrorCode, throwTemporalError } from '../errors/index.ts';
import { buildForecastEvidence, buildPredictionEvidence, buildReplayEvidence,buildSimulationEvidence, buildTrajectoryEvidence, buildTrendEvidence, createTemporalEvidence, mergeEvidence } from '../evidence/index.ts';
import { analyzeComplexityEvolution, analyzeCouplingEvolution, analyzeDependencyEvolution, analyzeDriftEvolution,analyzeInstabilityEvolution, analyzePropagationEvolution, analyzeSemanticEvolution, buildEvolutionPoints, computeAggregateDeltas, computeGraphDelta, computeGraphGrowthRate, computeTotalEvolution, EvolutionEngine } from '../evolution/index.ts';
import { buildReasoningChain,explainDegradation, explainForecast, explainPredictions, explainSimulation, explainTrends, generateTemporalExplanation, generateTrajectoryExplanation, renderEvidence, renderEvidenceList } from '../explainability/index.ts';
import type { ForecastingInput } from '../forecasting/index.ts';
import { computeForecastHorizon,createForecastWindow, forecastComplexity, forecastGraphGrowth, ForecastingEngine, forecastPropagation, forecastRisk, forecastSemantic } from '../forecasting/index.ts';
import { analyzeHotspotEmergence, analyzeHotspotEvolution, diffHotspots, forecastHotspots } from '../hotspot/index.ts';
import type { DegradationRecord, ForecastRecord, PredictionRecord, SimulationRecord,TimelineRecord } from '../persistence/index.ts';
import { DegradationRepository, ForecastRepository, PredictionRepository, SimulationRepository, TemporalPersistence,TimelineRepository } from '../persistence/index.ts';
import type { PredictionInput } from '../prediction/index.ts';
import { analyzeConfidence, assessPredictionRisk,createPredictionWindow, evaluatePredictionEvidence, generateBoundedPrediction, isWithinBounds, PredictionEngine, rankPredictions } from '../prediction/index.ts';
import { detectArchitectureRegression, RegressionEngine } from '../regression/index.ts';
import { analyzeRemediationEffectiveness, analyzeRemediationFailures, analyzeRemediationImpactTrajectory, analyzeRemediationSuccesses,buildRemediationHistory, compareRemediationActions, detectRemediationRegression as detectRemediationRegressionFn } from '../remediation/index.ts';
import { compareReplayResults, computeForecastFingerprint, deterministicPredict, validateReplayInput,verifyDeterminism, verifyFingerprint, verifyForecastReplay, verifyReplayConsistency } from '../replay/index.ts';
import type { DegradationScore } from '../scoring/index.ts';
import { prioritizeHotspots, prioritizeRemediations, prioritizeTrends, scoreDegradation, scoreOperationalRisk,scorePrediction, scorePredictions, scoreTrajectory } from '../scoring/index.ts';
import { canonicalizeForecast, canonicalizePrediction,canonicalizeSnapshot, deserializeEvolutionPoint, deserializeForecast, deserializeSimulation, deserializeSnapshot, deserializeTrajectory, serializeEvolutionPoint, serializeForecast, serializeSimulation, serializeSnapshot, serializeTrajectory } from '../serialization/index.ts';
import type { SimulationInput } from '../simulation/index.ts';
import { generateSimulationSteps, simulateDegradation, simulatePropagation, SimulationEngine, validateSimulation as validateSimulationBatch } from '../simulation/index.ts';
import { TemporalTelemetry } from '../telemetry/index.ts';
import type { TimelineQuery } from '../timeline/index.ts';
import { buildTemporalContext, buildTimelineIndex, createTimelineWindow, findSnapshotAtTime, findSnapshotsByFingerprint, getSnapshotRange, queryTimeline,sequenceSnapshots, sliceTimeline, SnapshotTimeline } from '../timeline/index.ts';
import { analyzeArchitecturalTrajectory, analyzeComplexityTrajectory, analyzeRiskTrajectory,compareTrajectories, TrajectoryEngine } from '../trajectory/index.ts';
import type {TrendSignal } from '../trend/index.ts';
import { analyzeGraphTrends, analyzeInstabilityTrends,detectTrends, getTopTrends, getWorseningTrends, rankTrends, TrendEngine } from '../trend/index.ts';
import type { BoundedPrediction, DegradationPoint, EvolutionPoint, ForecastResult, ForecastWindow, HotspotEvolutionPoint, MetricTrajectory, RemediationRecord, SimulationResult, SimulationStep,TemporalEvidence, TemporalSnapshot, TrajectoryResult } from '../types/index.ts';
import { calculateAcceleration, calculateSlope, calculateVolatility, computeBounds, computeMovingAverage, determineTrend, generateId, linearProjection, now } from '../utils/index.ts';
import { validateForecast, validateForecastDeterminism, validatePrediction, validatePredictionDeterminism, validatePredictions as validatePredictionsBatch, validateReplaySnapshots, validateTemporalIntegrity } from '../validation/index.ts';

/* ========================================================================== */
/*  Helper factories                                                           */
/* ========================================================================== */

const BASE_TIME = new Date('2024-01-01T00:00:00Z').getTime();


function makeSnapshot(overrides?: Partial<TemporalSnapshot>): TemporalSnapshot {
  return {
    id: 'snap_1', projectId: 'proj_1', timestamp: new Date(BASE_TIME).toISOString(),
    label: 'v1', fingerprint: 'fp_abc', metadata: {}, nodeCount: 10, edgeCount: 15,
    ...overrides,
  };
}

function makeEvolutionPoint(overrides?: Partial<EvolutionPoint>): EvolutionPoint {
  return {
    snapshotId: 'snap_1', timestamp: new Date(BASE_TIME).toISOString(),
    nodeCount: 10, edgeCount: 15, complexity: 0, instability: 0, coupling: 0,
    propagation: 0, hotspotCount: 0, semanticScore: 1, driftScore: 0,
    ...overrides,
  };
}

function makeHotspotPoint(overrides?: Partial<HotspotEvolutionPoint>): HotspotEvolutionPoint {
  return {
    timestamp: new Date(BASE_TIME).toISOString(), hotspotId: 'hs_1',
    modulePath: 'src/module_a', intensity: 0.5, riskScore: 0.3, affectedModules: 2,
    ...overrides,
  };
}

function makeRemediationRecord(overrides?: Partial<RemediationRecord>): RemediationRecord {
  return {
    id: 'rem_1', snapshotId: 'snap_1', timestamp: new Date(BASE_TIME).toISOString(),
    targetModule: 'src/module_a', actionType: 'refactor', description: 'Refactored module',
    successScore: 0.8, impactScore: 0.6, regressionScore: 0.1,
    ...overrides,
  };
}

function makeMetricTrajectory(overrides?: Partial<MetricTrajectory>): MetricTrajectory {
  return {
    metricName: 'nodes', points: [{ timestamp: new Date(BASE_TIME).toISOString(), value: 10 }],
    slope: 0, acceleration: 0, volatility: 0, trend: 'stable' as const,
    ...overrides,
  };
}

function makeForecastWindow(overrides?: Partial<ForecastWindow>): ForecastWindow {
  return {
    startTimestamp: new Date(BASE_TIME).toISOString(),
    endTimestamp: new Date(BASE_TIME + 86_400_000).toISOString(),
    projectionCount: 5, confidenceThreshold: 0.8,
    bounds: { lower: 0, upper: 1000 },
    ...overrides,
  };
}

function makeBoundedPrediction(overrides?: Partial<BoundedPrediction>): BoundedPrediction {
  return {
    metricName: 'nodes', currentValue: 10, predictedValue: 12,
    lowerBound: 8, upperBound: 16, confidence: 0.85, horizonMs: 86400000,
    ...overrides,
  };
}

function makeEvidence(overrides?: Partial<TemporalEvidence>): TemporalEvidence {
  return {
    type: 'trend', description: 'Trend evidence', snapshotIds: ['snap_1'],
    metricValues: { nodes: 10 }, trajectorySlope: 0.1, confidence: 0.8,
    ...overrides,
  };
}

function makeForecastResult(overrides?: Partial<ForecastResult>): ForecastResult {
  return {
    id: 'fc_1', projectId: 'proj_1', createdAt: new Date(BASE_TIME).toISOString(),
    forecastWindow: makeForecastWindow(), predictions: [makeBoundedPrediction()],
    evidence: [makeEvidence()], confidence: 0.85, fingerprint: 'fp_forecast',
    ...overrides,
  };
}

function makeTrajectoryResult(overrides?: Partial<TrajectoryResult>): TrajectoryResult {
  return {
    id: 'tr_1', projectId: 'proj_1', createdAt: new Date(BASE_TIME).toISOString(),
    metricTrajectories: [makeMetricTrajectory()],
    degradationVelocity: 0, instabilityAcceleration: 0, hotspotGrowthRate: 0,
    ...overrides,
  };
}

function makeSimulationStep(overrides?: Partial<SimulationStep>): SimulationStep {
  return {
    stepIndex: 0, simulatedTimestamp: new Date(BASE_TIME + 86_400_000).toISOString(),
    predictedValues: { nodes: 12 }, confidence: 0.8,
    ...overrides,
  };
}

function makeSimulationResult(overrides?: Partial<SimulationResult>): SimulationResult {
  return {
    id: 'sim_1', projectId: 'proj_1', createdAt: new Date(BASE_TIME).toISOString(),
    scenarioName: 'worst_case', steps: [makeSimulationStep()],
    bounds: makeForecastWindow(), fingerprint: 'fp_sim',
    ...overrides,
  };
}

function makeDegradationPoint(overrides?: Partial<DegradationPoint>): DegradationPoint {
  return {
    snapshotId: 'snap_1', timestamp: new Date(BASE_TIME).toISOString(),
    erosionScore: 0.1, fragmentationScore: 0.1, fatigueScore: 0.1,
    instabilityAccumulation: 0, decayAcceleration: 0,
    ...overrides,
  };
}

/* ========================================================================== */
/*  1. Errors                                                                  */
/* ========================================================================== */

describe('TemporalError', () => {
  it('creates error with message and code', () => {
    const err = new TemporalError('test error', TemporalErrorCode.INVALID_TIMELINE, { id: 'x' });
    expect(err.message).toBe('test error');
    expect(err.code).toBe(TemporalErrorCode.INVALID_TIMELINE);
    expect(err.details).toEqual({ id: 'x' });
    expect(err.name).toBe('TemporalError');
  });

  it('throwTemporalError throws', () => {
    expect(() => throwTemporalError(TemporalErrorCode.SNAPSHOT_NOT_FOUND, 'not found')).toThrow(TemporalError);
  });

  it('has all error codes defined', () => {
    const codes = Object.values(TemporalErrorCode);
    expect(codes).toContain('INVALID_TIMELINE');
    expect(codes).toContain('SNAPSHOT_NOT_FOUND');
    expect(codes).toContain('REPLAY_MISMATCH');
    expect(codes).toContain('SERIALIZATION_ERROR');
    expect(codes.length).toBeGreaterThan(10);
  });
});

/* ========================================================================== */
/*  2. Utils                                                                   */
/* ========================================================================== */

describe('utils', () => {
  describe('calculateSlope', () => {
    it('returns 0 for fewer than 2 points', () => {
      expect(calculateSlope([])).toBe(0);
      expect(calculateSlope([{ timestamp: '2024-01-01T00:00:00Z', value: 5 }])).toBe(0);
    });

    it('computes positive slope', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0 },
        { timestamp: '2024-01-02T00:00:00Z', value: 10 },
      ];
      expect(calculateSlope(points)).toBeGreaterThan(0);
    });
  });

  describe('calculateAcceleration', () => {
    it('returns 0 for fewer than 3 points', () => {
      expect(calculateAcceleration([])).toBe(0);
      expect(calculateAcceleration([{ timestamp: '2024-01-01T00:00:00Z', value: 1 }])).toBe(0);
    });

    it('computes acceleration', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0 },
        { timestamp: '2024-01-02T00:00:00Z', value: 2 },
        { timestamp: '2024-01-03T00:00:00Z', value: 8 },
      ];
      expect(calculateAcceleration(points)).not.toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('returns 0 for fewer than 2 points', () => {
      expect(calculateVolatility([{ timestamp: '', value: 1 }])).toBe(0);
    });

    it('computes standard deviation', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 1 },
        { timestamp: '2024-01-02T00:00:00Z', value: 3 },
      ];
      expect(calculateVolatility(points)).toBe(1);
    });
  });

  describe('computeMovingAverage', () => {
    it('returns same values for window=1', () => {
      expect(computeMovingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });

    it('computes rolling average', () => {
      expect(computeMovingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
    });

    it('handles empty array', () => {
      expect(computeMovingAverage([], 3)).toEqual([]);
    });
  });

  describe('determineTrend', () => {
    it('returns stable for fewer than 2 points', () => {
      expect(determineTrend([{ timestamp: '', value: 1 }])).toBe('stable');
    });

    it('returns increasing when slope > 0.01 * mean', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00.000Z', value: 10 },
        { timestamp: '2024-01-01T00:00:00.001Z', value: 11 },
        { timestamp: '2024-01-01T00:00:00.002Z', value: 12 },
        { timestamp: '2024-01-01T00:00:00.003Z', value: 13 },
      ];
      expect(determineTrend(points)).toBe('increasing');
    });

    it('returns decreasing when slope < -0.01 * mean', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00.000Z', value: 13 },
        { timestamp: '2024-01-01T00:00:00.001Z', value: 12 },
        { timestamp: '2024-01-01T00:00:00.002Z', value: 11 },
        { timestamp: '2024-01-01T00:00:00.003Z', value: 10 },
      ];
      expect(determineTrend(points)).toBe('decreasing');
    });

    it('returns volatile when relativeVolatility > 0.5', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0 },
        { timestamp: '2024-01-02T00:00:00Z', value: 10 },
        { timestamp: '2024-01-03T00:00:00Z', value: 0 },
        { timestamp: '2024-01-04T00:00:00Z', value: 10 },
      ];
      expect(determineTrend(points)).toBe('volatile');
    });

    it('returns stable for flat line', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 5 },
        { timestamp: '2024-01-02T00:00:00Z', value: 5 },
      ];
      expect(determineTrend(points)).toBe('stable');
    });
  });

  describe('linearProjection', () => {
    it('returns last value with 0 confidence for < 2 points', () => {
      expect(linearProjection([{ timestamp: '', value: 5 }], '2024-01-02T00:00:00Z')).toEqual({ value: 5, confidence: 0 });
    });

    it('projects forward', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0 },
        { timestamp: '2024-01-02T00:00:00Z', value: 10 },
      ];
      const result = linearProjection(points, '2024-01-03T00:00:00Z');
      expect(result.value).toBe(20);
    });

    it('bounds confidence between 0 and 1', () => {
      const points = [
        { timestamp: '2024-01-01T00:00:00Z', value: 0 },
        { timestamp: '2024-01-02T00:00:00Z', value: 10 },
      ];
      const result = linearProjection(points, '2024-01-03T00:00:00Z');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('computeBounds', () => {
    it('computes bounds proportional to (1-confidence)', () => {
      const result = computeBounds(100, 0.8, 0, 1000);
      expect(result.lower).toBeLessThan(100);
      expect(result.upper).toBeGreaterThan(100);
    });

    it('wider spread for longer horizon', () => {
      const short = computeBounds(100, 0.8, 500, 1000);
      const long = computeBounds(100, 0.8, 1000, 1000);
      expect(long.upper - long.lower).toBeGreaterThan(short.upper - short.lower);
    });
  });

  describe('generateId', () => {
    it('returns a non-empty string with dash separator', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id).toContain('-');
    });

    it('returns unique ids', () => {
      const ids = new Set(Array.from({ length: 10 }, () => generateId()));
      expect(ids.size).toBe(10);
    });
  });

  describe('now', () => {
    it('returns ISO string', () => {
      expect(now()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});

/* ========================================================================== */
/*  3. Timeline                                                                */
/* ========================================================================== */

describe('SnapshotTimeline', () => {
  let timeline: SnapshotTimeline;

  beforeEach(() => {
    timeline = new SnapshotTimeline();
  });

  it('starts empty', () => {
    expect(timeline.getCount()).toBe(0);
    expect(timeline.getAll()).toEqual([]);
    expect(timeline.getLatest()).toBeNull();
    expect(timeline.getEarliest()).toBeNull();
  });

  it('constructor sequences existing snapshots', () => {
    const snaps = [
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
    ];
    timeline = new SnapshotTimeline(snaps);
    expect(timeline.getCount()).toBe(2);
    expect(timeline.getAll()[0]!.id).toBe('s1');
  });

  it('addSnapshot sorts by timestamp', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }));
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    expect(timeline.getAll()[0]!.id).toBe('s1');
  });

  it('addSnapshot rejects equal timestamps via sequence validation', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    expect(() => timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-01T00:00:00Z' })))
      .toThrow(TemporalError);
  });

  it('getLatest returns most recent', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }));
    expect(timeline.getLatest()!.id).toBe('s2');
  });

  it('getEarliest returns first', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }));
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    expect(timeline.getEarliest()!.id).toBe('s1');
  });

  it('getSnapshot finds by id', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1' }));
    expect(timeline.getSnapshot('s1')).not.toBeNull();
    expect(timeline.getSnapshot('nonexistent')).toBeNull();
  });

  it('getWindow creates a TemporalWindow', () => {
    const s1 = makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' });
    const s2 = makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' });
    timeline.addSnapshot(s1);
    timeline.addSnapshot(s2);
    const win = timeline.getWindow('s1', 's2');
    expect(win.snapshotCount).toBe(2);
    expect(win.startSnapshotId).toBe('s1');
    expect(win.endSnapshotId).toBe('s2');
  });

  it('getWindow throws for missing snapshot', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1' }));
    expect(() => timeline.getWindow('s1', 'nonexistent')).toThrow(TemporalError);
  });

  it('slice filters by time range', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }));
    const sliced = timeline.slice('2024-01-02T00:00:00Z');
    expect(sliced).toHaveLength(1);
    expect(sliced[0]!.id).toBe('s2');
  });

  it('slice with limit returns last N', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }));
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }));
    const sliced = timeline.slice(undefined, undefined, 1);
    expect(sliced).toHaveLength(1);
    expect(sliced[0]!.id).toBe('s2');
  });

  it('getEntries builds TimelineEntry list', () => {
    timeline.addSnapshot(makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z', nodeCount: 10, edgeCount: 15 }));
    timeline.addSnapshot(makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z', nodeCount: 12, edgeCount: 18 }));
    const entries = timeline.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.index).toBe(0);
    expect(entries[1]!.delta.nodeDelta).toBe(2);
    expect(entries[1]!.delta.edgeDelta).toBe(3);
  });
});

describe('snapshot-sequencing', () => {
  it('sequenceSnapshots sorts and validates', () => {
    const snaps = [
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
    ];
    const result = sequenceSnapshots(snaps);
    expect(result[0]!.id).toBe('s1');
  });

  it('sequenceSnapshots throws for equal timestamps', () => {
    expect(() => sequenceSnapshots([
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-01T00:00:00Z' }),
    ])).toThrow(TemporalError);
  });

  it('sequenceSnapshots returns empty for empty input', () => {
    expect(sequenceSnapshots([])).toEqual([]);
  });

  it('findSnapshotAtTime returns snapshot at or before time', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-03T00:00:00Z' }),
    ];
    expect(findSnapshotAtTime(snaps, '2024-01-02T00:00:00Z')!.id).toBe('s1');
    expect(findSnapshotAtTime(snaps, '2024-01-01T00:00:00Z')!.id).toBe('s1');
  });

  it('findSnapshotAtTime returns null when no snapshots before time', () => {
    const snaps = [makeSnapshot({ id: 's1', timestamp: '2024-01-03T00:00:00Z' })];
    expect(findSnapshotAtTime(snaps, '2024-01-01T00:00:00Z')).toBeNull();
  });
});

describe('timeline-window', () => {
  it('createTimelineWindow returns correct window', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const win = createTimelineWindow(snaps, 's1', 's2');
    expect(win.snapshotCount).toBe(2);
    expect(win.intervalMs).toBe(86400000);
  });

  it('createTimelineWindow throws for missing start', () => {
    const snaps = [makeSnapshot({ id: 's1' })];
    expect(() => createTimelineWindow(snaps, 'missing', 's1')).toThrow(TemporalError);
  });

  it('sliceTimeline filters and limits', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
      makeSnapshot({ id: 's3', timestamp: '2024-01-03T00:00:00Z' }),
    ];
    expect(sliceTimeline(snaps, '2024-01-02T00:00:00Z')).toHaveLength(2);
    expect(sliceTimeline(snaps, undefined, '2024-01-02T00:00:00Z')).toHaveLength(2);
    expect(sliceTimeline(snaps, undefined, undefined, 2)).toHaveLength(2);
    expect(sliceTimeline(snaps, '2024-01-02T00:00:00Z', '2024-01-02T00:00:00Z')).toHaveLength(1);
  });
});

describe('timeline-index', () => {
  const snaps = [
    makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_1', nodeCount: 10, edgeCount: 15 }),
    makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z', fingerprint: 'fp_2', nodeCount: 12, edgeCount: 18 }),
  ];

  it('buildTimelineIndex creates index entries', () => {
    const idx = buildTimelineIndex(snaps);
    expect(idx).toHaveLength(2);
    expect(idx[0]!.snapshotId).toBe('s1');
    expect(idx[0]!.complexityScore).toBe(10 + 15 * 0.5);
  });

  it('findSnapshotsByFingerprint filters', () => {
    const idx = buildTimelineIndex(snaps);
    expect(findSnapshotsByFingerprint(idx, 'fp_1')).toHaveLength(1);
    expect(findSnapshotsByFingerprint(idx, 'nonexistent')).toEqual([]);
  });

  it('getSnapshotRange filters by time', () => {
    const idx = buildTimelineIndex(snaps);
    const range = getSnapshotRange(idx, '2024-01-01T00:00:00Z', '2024-01-01T12:00:00Z');
    expect(range).toHaveLength(1);
    expect(range[0]!.snapshotId).toBe('s1');
  });
});

describe('temporal-context', () => {
  it('buildTemporalContext creates context with timeline', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const ctx = buildTemporalContext(snaps);
    expect(ctx.snapshotCount).toBe(2);
    expect(ctx.currentSnapshot!.id).toBe('s2');
    expect(ctx.previousSnapshot!.id).toBe('s1');
    expect(ctx.totalDurationMs).toBe(86400000);
    expect(ctx.averageIntervalMs).toBe(86400000);
  });

  it('returns null previousSnapshot for single snapshot', () => {
    const snaps = [makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' })];
    const ctx = buildTemporalContext(snaps);
    expect(ctx.previousSnapshot).toBeNull();
    expect(ctx.totalDurationMs).toBe(0);
  });

  it('returns null currentSnapshot for empty snapshots', () => {
    const ctx = buildTemporalContext([]);
    expect(ctx.currentSnapshot).toBeNull();
    expect(ctx.previousSnapshot).toBeNull();
    expect(ctx.snapshotCount).toBe(0);
  });
});

describe('timeline-query', () => {
  const snaps = [
    makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
    makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
    makeSnapshot({ id: 's3', timestamp: '2024-01-03T00:00:00Z' }),
  ];

  it('queryTimeline filters by time range', () => {
    const q: TimelineQuery = { startTimestamp: '2024-01-02T00:00:00Z' };
    const result = queryTimeline(snaps, q);
    expect(result).toHaveLength(2);
  });

  it('queryTimeline filters by snapshotIds', () => {
    const q: TimelineQuery = { snapshotIds: ['s1', 's3'] };
    const result = queryTimeline(snaps, q);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('s1');
    expect(result[1]!.id).toBe('s3');
  });

  it('queryTimeline applies offset and limit', () => {
    const q: TimelineQuery = { offset: 1, limit: 1 };
    const result = queryTimeline(snaps, q);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('s2');
  });
});

/* ========================================================================== */
/*  4. Evolution                                                               */
/* ========================================================================== */

describe('evolution-diff', () => {
  const prev = makeSnapshot({ id: 's1', nodeCount: 10, edgeCount: 15 });
  const curr = makeSnapshot({ id: 's2', nodeCount: 12, edgeCount: 18 });

  it('computeGraphDelta computes positive changes', () => {
    const d = computeGraphDelta(prev, curr);
    expect(d.addedNodes).toBe(2);
    expect(d.addedEdges).toBe(3);
    expect(d.removedNodes).toBe(0);
    expect(d.nodeCountChange).toBe(2);
    expect(d.edgeCountChange).toBe(3);
  });

  it('computeGraphDelta handles decreases', () => {
    const d = computeGraphDelta(curr, prev);
    expect(d.addedNodes).toBe(0);
    expect(d.removedNodes).toBe(2);
    expect(d.nodeCountChange).toBe(-2);
  });

  it('computeAggregateDeltas returns per-transition deltas', () => {
    const s1 = makeSnapshot({ id: 's1', nodeCount: 10, edgeCount: 15 });
    const s2 = makeSnapshot({ id: 's2', nodeCount: 12, edgeCount: 18 });
    const s3 = makeSnapshot({ id: 's3', nodeCount: 15, edgeCount: 20 });
    const deltas = computeAggregateDeltas([s1, s2, s3]);
    expect(deltas).toHaveLength(2);
    expect(deltas[0]!.nodeCountChange).toBe(2);
    expect(deltas[1]!.nodeCountChange).toBe(3);
  });

  it('computeTotalEvolution sums deltas', () => {
    const s1 = makeSnapshot({ id: 's1', nodeCount: 10, edgeCount: 15 });
    const s2 = makeSnapshot({ id: 's2', nodeCount: 12, edgeCount: 18 });
    const total = computeTotalEvolution(computeAggregateDeltas([s1, s2]));
    expect(total.addedNodes).toBe(2);
    expect(total.nodeCountChange).toBe(2);
  });
});

describe('graph-evolution', () => {
  it('buildEvolutionPoints creates points from snapshots', () => {
    const snaps = [
      makeSnapshot({ id: 's1', nodeCount: 10, edgeCount: 15 }),
      makeSnapshot({ id: 's2', nodeCount: 12, edgeCount: 18 }),
    ];
    const points = buildEvolutionPoints(snaps);
    expect(points).toHaveLength(2);
    expect(points[0]!.complexity).toBe(10 + 15 * 0.5);
    expect(points[0]!.instability).toBe(0);
    expect(points[0]!.semanticScore).toBe(1);
  });

  it('computeGraphGrowthRate returns rate', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ nodeCount: 12, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    expect(computeGraphGrowthRate(points)).toBeGreaterThan(0);
  });

  it('computeGraphGrowthRate returns 0 for < 2 points', () => {
    expect(computeGraphGrowthRate([makeEvolutionPoint()])).toBe(0);
  });
});

describe('evolution-analysis functions', () => {
  const points = [
    makeEvolutionPoint({ complexity: 10, instability: 0.2, coupling: 0.3, propagation: 0.1, semanticScore: 1, driftScore: 0, timestamp: '2024-01-01T00:00:00Z' }),
    makeEvolutionPoint({ complexity: 12, instability: 0.3, coupling: 0.35, propagation: 0.15, semanticScore: 0.9, driftScore: 0.1, timestamp: '2024-01-02T00:00:00Z' }),
  ];

  it('analyzeComplexityEvolution returns trajectory', () => {
    const t = analyzeComplexityEvolution(points);
    expect(t.metricName).toBe('complexity');
    expect(t.points).toHaveLength(2);
  });

  it('analyzeInstabilityEvolution returns trajectory', () => {
    const t = analyzeInstabilityEvolution(points);
    expect(t.metricName).toBe('instability');
  });

  it('analyzeCouplingEvolution returns trajectory', () => {
    const t = analyzeCouplingEvolution(points);
    expect(t.metricName).toBe('coupling');
  });

  it('analyzePropagationEvolution returns trajectory', () => {
    const t = analyzePropagationEvolution(points);
    expect(t.metricName).toBe('propagation');
  });

  it('analyzeSemanticEvolution returns trajectory', () => {
    const t = analyzeSemanticEvolution(points);
    expect(t.metricName).toBe('semantic');
  });

  it('analyzeDriftEvolution returns trajectory', () => {
    const t = analyzeDriftEvolution(points);
    expect(t.metricName).toBe('drift');
  });

  it('analyzeDependencyEvolution returns result', () => {
    const r = analyzeDependencyEvolution(points);
    expect(r).toHaveProperty('growthRate');
    expect(r).toHaveProperty('currentDensity');
    expect(r).toHaveProperty('trend');
  });

  it('analyzeDependencyEvolution returns stable for < 2 points', () => {
    const r = analyzeDependencyEvolution([makeEvolutionPoint()]);
    expect(r.trend).toBe('stable');
  });
});

describe('EvolutionEngine', () => {
  let engine: EvolutionEngine;

  beforeEach(() => {
    engine = new EvolutionEngine();
  });

  it('analyze returns EvolutionResult', () => {
    const snaps = [
      makeSnapshot({ id: 's1', nodeCount: 10, edgeCount: 15, timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', nodeCount: 12, edgeCount: 18, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const result = engine.analyze(snaps);
    expect(result.evolutionPoints).toHaveLength(2);
    expect(result.snapshotCount).toBe(2);
    expect(result.totalEvolution.nodeCountChange).toBe(2);
    expect(result.complexityTrajectory.metricName).toBe('complexity');
    expect(result.instabilityTrajectory.metricName).toBe('instability');
    expect(result.dependencyEvolution).toBeDefined();
  });

  it('analyze throws for < 2 snapshots', () => {
    expect(() => engine.analyze([makeSnapshot()])).toThrow(TemporalError);
  });
});

/* ========================================================================== */
/*  5. Trajectory                                                              */
/* ========================================================================== */

describe('architectural-trajectory', () => {
  it('analyzeArchitecturalTrajectory returns direction and trajectories', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, edgeCount: 15, timestamp: '2024-01-01T00:00:00.000Z' }),
      makeEvolutionPoint({ nodeCount: 200, edgeCount: 18, timestamp: '2024-01-01T00:00:01.000Z' }),
    ];
    const r = analyzeArchitecturalTrajectory(points);
    expect(r.direction).toBe('growing');
    expect(r.nodeTrajectory.metricName).toBe('nodes');
    expect(r.edgeTrajectory.metricName).toBe('edges');
    expect(r.complexityTrajectory.metricName).toBe('complexity');
  });

  it('returns stable direction for flat data', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ nodeCount: 10, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    expect(analyzeArchitecturalTrajectory(points).direction).toBe('stable');
  });
});

describe('risk-trajectory', () => {
  it('analyzeRiskTrajectory returns instability, propagation, coupling trajectories', () => {
    const points = [
      makeEvolutionPoint({ instability: 0.1, propagation: 0.2, coupling: 0.3, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ instability: 0.2, propagation: 0.25, coupling: 0.35, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeRiskTrajectory(points);
    expect(r.instabilityTrajectory.metricName).toBe('instability');
    expect(r.propagationTrajectory.metricName).toBe('propagation');
    expect(r.couplingTrajectory.metricName).toBe('coupling');
    expect(r.riskAcceleration).toBeDefined();
  });
});

describe('TrajectoryEngine', () => {
  it('analyzeTrajectories returns TrajectoryResult', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, edgeCount: 15, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ nodeCount: 12, edgeCount: 18, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const engine = new TrajectoryEngine();
    const r = engine.analyzeTrajectories(points, 'proj_1');
    expect(r.projectId).toBe('proj_1');
    expect(r.metricTrajectories.length).toBeGreaterThanOrEqual(6);
    expect(r.degradationVelocity).toBeDefined();
    expect(r.instabilityAcceleration).toBeDefined();
    expect(r.hotspotGrowthRate).toBeDefined();
  });
});

describe('analyzeComplexityTrajectory', () => {
  it('computes complexity trajectory', () => {
    const points = [
      makeEvolutionPoint({ complexity: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ complexity: 12, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeComplexityTrajectory(points);
    expect(r).toBeDefined();
  });
});

describe('trajectory-comparison', () => {
  it('compareTrajectories returns comparison', () => {
    const result = compareTrajectories(makeMetricTrajectory(), makeMetricTrajectory());
    expect(result).toBeDefined();
  });
});

/* ========================================================================== */
/*  6. Trend                                                                   */
/* ========================================================================== */

describe('trend-detection', () => {
  it('detectTrends returns signals for standard metrics', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, edgeCount: 15, complexity: 10, instability: 0.1, propagation: 0.1, coupling: 0.1, driftScore: 0, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ nodeCount: 12, edgeCount: 18, complexity: 12, instability: 0.2, propagation: 0.15, coupling: 0.15, driftScore: 0.05, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const signals = detectTrends(points);
    expect(signals).toHaveLength(7);
    expect(signals[0]!.metricName).toBe('nodeCount');
    expect(signals[0]!.trend).toBeDefined();
    expect(signals[0]!.strength).toBeGreaterThanOrEqual(0);
  });
});

describe('trend-ranking', () => {
  it('rankTrends sorts by strength descending', () => {
    const signals: TrendSignal[] = [
      { metricName: 'a', trend: 'increasing', slope: 1, acceleration: 0, strength: 0.3, sustained: false },
      { metricName: 'b', trend: 'stable', slope: 0, acceleration: 0, strength: 0.1, sustained: false },
      { metricName: 'c', trend: 'decreasing', slope: -1, acceleration: 0, strength: 0.5, sustained: false },
    ];
    const ranked = rankTrends(signals);
    expect(ranked[0]!.metricName).toBe('c');
    expect(ranked[2]!.metricName).toBe('b');
  });

  it('getTopTrends returns first N', () => {
    const signals: TrendSignal[] = [
      { metricName: 'a', trend: 'increasing', slope: 1, acceleration: 0, strength: 0.3, sustained: false },
      { metricName: 'b', trend: 'stable', slope: 0, acceleration: 0, strength: 0.1, sustained: false },
    ];
    expect(getTopTrends(signals, 1)).toHaveLength(1);
  });

  it('getWorseningTrends returns increasing or volatile', () => {
    const signals: TrendSignal[] = [
      { metricName: 'a', trend: 'increasing', slope: 0.5, acceleration: 0, strength: 0.5, sustained: false },
      { metricName: 'b', trend: 'volatile', slope: 0.1, acceleration: 0, strength: 0.2, sustained: false },
      { metricName: 'c', trend: 'stable', slope: 0, acceleration: 0, strength: 0, sustained: false },
    ];
    expect(getWorseningTrends(signals)).toHaveLength(2);
  });
});

describe('TrendEngine', () => {
  it('analyze returns TrendAnalysisResult', () => {
    const points = [
      makeEvolutionPoint({ nodeCount: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ nodeCount: 12, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const engine = new TrendEngine();
    const r = engine.analyze(points);
    expect(r.allTrends).toHaveLength(7);
    expect(r.topTrends.length).toBeLessThanOrEqual(5);
    expect(r.summary).toContain('worsening');
  });

  it('analyze with empty data returns summary of no trends', () => {
    const engine = new TrendEngine();
    const r = engine.analyze([makeEvolutionPoint()]);
    expect(r.summary).toMatch(/No significant/);
  });
});

describe('analyzeGraphTrends', () => {
  it('analyzes graph trends', () => {
    const points = [makeEvolutionPoint(), makeEvolutionPoint({ nodeCount: 15 })];
    const r = analyzeGraphTrends(points);
    expect(r).toBeDefined();
  });
});

describe('analyzeInstabilityTrends', () => {
  it('analyzes instability trends', () => {
    const points = [
      makeEvolutionPoint({ instability: 0.1, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ instability: 0.3, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeInstabilityTrends(points);
    expect(r).toBeDefined();
  });
});

/* ========================================================================== */
/*  7. Regression                                                              */
/* ========================================================================== */

describe('architecture-regression', () => {
  it('detectArchitectureRegression detects regression', () => {
    const earlier = [makeEvolutionPoint({ complexity: 5, instability: 0.1, propagation: 0.1, timestamp: '2024-01-01T00:00:00Z' })];
    const later = [makeEvolutionPoint({ complexity: 10, instability: 0.5, propagation: 0.4, timestamp: '2024-01-02T00:00:00Z' })];
    const r = detectArchitectureRegression(earlier, later);
    expect(r.hasRegression).toBe(true);
    expect(r.regressionDirection).toBe('degrading');
  });

  it('returns no regression when scores are low', () => {
    const pts = [makeEvolutionPoint({ complexity: 10, instability: 0.3, propagation: 0.2, timestamp: '2024-01-01T00:00:00Z' })];
    const r = detectArchitectureRegression(pts, pts);
    expect(r.hasRegression).toBe(false);
    expect(r.regressionDirection).toBe('stable');
  });

  it('returns insufficient_data for empty arrays', () => {
    const r = detectArchitectureRegression([], [makeEvolutionPoint()]);
    expect(r.hasRegression).toBe(false);
    expect(r.regressionDirection).toBe('insufficient_data');
  });
});

describe('RegressionEngine', () => {
  it('analyze detects regression', () => {
    const earlier = [makeEvolutionPoint({ complexity: 5, instability: 0.1, propagation: 0.1, timestamp: '2024-01-01T00:00:00Z' })];
    const later = [makeEvolutionPoint({ complexity: 10, instability: 0.5, propagation: 0.4, timestamp: '2024-01-02T00:00:00Z' })];
    const traj = makeMetricTrajectory();
    const engine = new RegressionEngine();
    const r = engine.analyze(earlier, later, traj);
    expect(r.architectureRegression.hasRegression).toBe(true);
    expect(r.hasAnyRegression).toBe(true);
  });

  it('accepts optional remediationRecords', () => {
    const pts = [makeEvolutionPoint({ timestamp: '2024-01-01T00:00:00Z' })];
    const traj = makeMetricTrajectory();
    const engine = new RegressionEngine();
    const r = engine.analyze(pts, pts, traj, [makeRemediationRecord()]);
    expect(r.remediationRegression).toBeDefined();
  });
});

/* ========================================================================== */
/*  8. Degradation                                                             */
/* ========================================================================== */

describe('erosion-analysis', () => {
  it('analyzeErosion returns erosion metrics', () => {
    const points = [
      makeEvolutionPoint({ semanticScore: 1, driftScore: 0, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ semanticScore: 0.8, driftScore: 0.2, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeErosion(points);
    expect(r.erosionScore).toBeGreaterThan(0);
    expect(r.erosionTrend).toBeDefined();
  });

  it('handles single point', () => {
    const r = analyzeErosion([makeEvolutionPoint()]);
    expect(r.erosionScore).toBeGreaterThanOrEqual(0);
  });
});

describe('degradation-classification', () => {
  it('classifyDegradation returns classification', () => {
    const points = [
      makeEvolutionPoint({ semanticScore: 0.9, driftScore: 0.1, coupling: 0.2, complexity: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ semanticScore: 0.7, driftScore: 0.3, coupling: 0.4, complexity: 15, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = classifyDegradation(points);
    expect(r.primaryClass).toBeDefined();
    expect(r.scores.healthy).toBeGreaterThanOrEqual(0);
  });
});

describe('degradation-priority', () => {
  it('prioritizeDegradation returns priority', () => {
    const points = [
      makeDegradationPoint({ erosionScore: 0.5, fragmentationScore: 0.5, fatigueScore: 0.5 }),
      makeDegradationPoint({ erosionScore: 0.6, fragmentationScore: 0.6, fatigueScore: 0.6 }),
    ];
    const r = prioritizeDegradation(points);
    expect(r.priorityLevel).toBe('medium');
    expect(r.priorityScore).toBeGreaterThan(0);
  });

  it('handles empty points', () => {
    const r = prioritizeDegradation([]);
    expect(r.priorityLevel).toBe('none');
  });
});

describe('degradation-forecast', () => {
  it('forecastDegradation returns projected values', () => {
    const points = [
      makeEvolutionPoint({ driftScore: 0.1, coupling: 0.2, complexity: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ driftScore: 0.15, coupling: 0.25, complexity: 12, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = forecastDegradation(points, '2024-01-03T00:00:00Z');
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.projectedErosion).toBeDefined();
  });

  it('returns zeros for insufficient points', () => {
    const r = forecastDegradation([makeEvolutionPoint()], '2024-01-02T00:00:00Z');
    expect(r.confidence).toBe(0);
  });
});

describe('DegradationEngine', () => {
  let engine: DegradationEngine;

  beforeEach(() => {
    engine = new DegradationEngine();
  });

  it('analyze returns comprehensive degradation analysis', () => {
    const points = [
      makeEvolutionPoint({ semanticScore: 0.9, driftScore: 0.1, coupling: 0.2, complexity: 10, instability: 0.1, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ semanticScore: 0.8, driftScore: 0.2, coupling: 0.3, complexity: 12, instability: 0.2, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = engine.analyze(points);
    expect(r.erosion).toBeDefined();
    expect(r.fragmentation).toBeDefined();
    expect(r.fatigue).toBeDefined();
    expect(r.overallDegradationScore).toBeGreaterThanOrEqual(0);
    expect(r.degradationLevel).toBeDefined();
    expect(r.degradationPoints).toHaveLength(2);
  });
});

describe('degradation utility functions', () => {
  it('analyzeFragmentation returns result', () => {
    const points = [makeEvolutionPoint(), makeEvolutionPoint({ coupling: 0.5 })];
    const r = analyzeFragmentation(points);
    expect(r.fragmentationScore).toBeDefined();
  });

  it('analyzeArchitecturalFatigue returns result', () => {
    const points = [
      makeEvolutionPoint({ complexity: 10, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ complexity: 15, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeArchitecturalFatigue(points);
    expect(r.fatigueScore).toBeDefined();
  });

  it('analyzeInstabilityGrowth returns result', () => {
    const points = [
      makeEvolutionPoint({ instability: 0.1, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ instability: 0.3, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeInstabilityGrowth(points);
    expect(r).toBeDefined();
  });
});

/* ========================================================================== */
/*  9. Hotspot                                                                 */
/* ========================================================================== */

describe('hotspot-evolution', () => {
  it('analyzeHotspotEvolution counts unique hotspots', () => {
    const history = [
      makeHotspotPoint({ hotspotId: 'hs_1', intensity: 0.8, timestamp: '2024-01-01T00:00:00Z' }),
      makeHotspotPoint({ hotspotId: 'hs_2', intensity: 0.6, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = analyzeHotspotEvolution(history);
    expect(r.totalHotspots).toBe(2);
    expect(r.activeHotspots).toBe(2);
    expect(r.resolvedHotspots).toBe(0);
  });

  it('classifies low intensity as resolved', () => {
    const history = [makeHotspotPoint({ hotspotId: 'hs_1', intensity: 0.1 })];
    const r = analyzeHotspotEvolution(history);
    expect(r.resolvedHotspots).toBe(1);
  });
});

describe('hotspot-diff', () => {
  it('diffHotspots identifies emerged, resolved, persisted', () => {
    const earlier = [
      makeHotspotPoint({ hotspotId: 'hs_1', intensity: 0.5 }),
      makeHotspotPoint({ hotspotId: 'hs_2', intensity: 0.5 }),
    ];
    const later = [
      makeHotspotPoint({ hotspotId: 'hs_1', intensity: 0.8 }),
      makeHotspotPoint({ hotspotId: 'hs_3', intensity: 0.6 }),
    ];
    const r = diffHotspots(earlier, later);
    expect(r.emerged).toHaveLength(1);
    expect(r.emerged[0]!.hotspotId).toBe('hs_3');
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0]!.hotspotId).toBe('hs_2');
    expect(r.persisted).toHaveLength(1);
    expect(r.persisted[0]!.hotspotId).toBe('hs_1');
    expect(r.intensityChanges['hs_1']).toBeCloseTo(0.3, 10);
  });

  it('handles empty arrays', () => {
    const r = diffHotspots([], [makeHotspotPoint()]);
    expect(r.emerged).toHaveLength(1);
    expect(r.resolved).toHaveLength(0);
  });
});

describe('hotspot-emergence', () => {
  it('analyzes emergence', () => {
    const history = [makeHotspotPoint()];
    const r = analyzeHotspotEmergence(history);
    expect(r).toBeDefined();
  });
});

describe('hotspot-forecast', () => {
  it('forecasts hotspots', () => {
    const history = [makeHotspotPoint()];
    const r = forecastHotspots(history, '2024-01-02T00:00:00Z');
    expect(r).toBeDefined();
  });
});

/* ========================================================================== */
/*  10. Forecasting                                                            */
/* ========================================================================== */

describe('forecast-window', () => {
  it('createForecastWindow creates valid window', () => {
    const w = createForecastWindow('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 5, 0.8);
    expect(w.projectionCount).toBe(5);
    expect(w.confidenceThreshold).toBe(0.8);
    expect(w.bounds).toEqual({ lower: 0, upper: Infinity });
  });

  it('createForecastWindow throws for end before start', () => {
    expect(() => createForecastWindow('2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z', 5, 0.8))
      .toThrow(TemporalError);
  });

  it('clamps projectionCount to minimum 1', () => {
    const w = createForecastWindow('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 0, 0.8);
    expect(w.projectionCount).toBe(1);
  });

  it('clamps confidenceThreshold to [0, 1]', () => {
    const w = createForecastWindow('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 5, -0.1);
    expect(w.confidenceThreshold).toBe(0);
  });

  it('computeForecastHorizon returns ms difference', () => {
    const w = makeForecastWindow();
    expect(computeForecastHorizon(w)).toBe(86400000);
  });
});

describe('forecasting functions', () => {
  const traj = makeMetricTrajectory({
    points: [
      { timestamp: '2024-01-01T00:00:00Z', value: 10 },
      { timestamp: '2024-01-02T00:00:00Z', value: 12 },
    ],
  });
  const window = makeForecastWindow();

  it('forecastRisk returns bounded prediction', () => {
    const p = forecastRisk(traj, window);
    expect(p.metricName).toBe('nodes');
    expect(p.predictedValue).toBeGreaterThan(0);
    expect(p.confidence).toBeGreaterThanOrEqual(0);
  });

  it('forecastComplexity delegates to forecastRisk', () => {
    const p = forecastComplexity(traj, window);
    expect(p.metricName).toBe('nodes');
  });

  it('forecastPropagation returns prediction', () => {
    const p = forecastPropagation(traj, window);
    expect(p).toBeDefined();
  });

  it('forecastSemantic returns prediction', () => {
    const p = forecastSemantic(traj, window);
    expect(p).toBeDefined();
  });

  it('forecastGraphGrowth returns prediction', () => {
    const p = forecastGraphGrowth(traj, window);
    expect(p).toBeDefined();
  });
});

describe('ForecastingEngine', () => {
  it('forecast returns ForecastResult', () => {
    const traj = makeMetricTrajectory({
      points: [
        { timestamp: '2024-01-01T00:00:00Z', value: 10 },
        { timestamp: '2024-01-02T00:00:00Z', value: 12 },
      ],
    });
    const input: ForecastingInput = {
      trajectories: [traj],
      window: makeForecastWindow(),
      evidence: [makeEvidence()],
    };
    const engine = new ForecastingEngine();
    const r = engine.forecast(input);
    expect(r.predictions).toHaveLength(1);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.fingerprint).toBeTruthy();
    expect(r.id).toBeTruthy();
  });
});

/* ========================================================================== */
/*  11. Prediction                                                             */
/* ========================================================================== */

describe('bounded-predictions', () => {
  it('generateBoundedPrediction creates prediction', () => {
    const values = [
      { timestamp: '2024-01-01T00:00:00Z', value: 10 },
      { timestamp: '2024-01-02T00:00:00Z', value: 12 },
    ];
    const window = makeForecastWindow();
    const p = generateBoundedPrediction('nodes', values, window);
    expect(p.metricName).toBe('nodes');
    expect(p.currentValue).toBe(12);
    expect(p.predictedValue).toBeGreaterThan(0);
  });

  it('isWithinBounds checks prediction validity', () => {
    const p = makeBoundedPrediction({ predictedValue: 10, lowerBound: 5, upperBound: 15 });
    expect(isWithinBounds(p)).toBe(true);
    expect(isWithinBounds({ ...p, predictedValue: 20 })).toBe(false);
  });
});

describe('confidence-analysis', () => {
  it('analyzeConfidence returns analysis', () => {
    const predictions = [
      makeBoundedPrediction({ confidence: 0.9 }),
      makeBoundedPrediction({ confidence: 0.7 }),
    ];
    const r = analyzeConfidence(predictions);
    expect(r.overallConfidence).toBe(0.8);
    expect(r.reliability).toBe('high');
    expect(r.factors).toHaveLength(2);
  });

  it('handles empty predictions', () => {
    const r = analyzeConfidence([]);
    expect(r.overallConfidence).toBe(0);
    expect(r.reliability).toBe('unreliable');
  });

  it('classifies reliability correctly', () => {
    expect(analyzeConfidence([makeBoundedPrediction({ confidence: 0.7 })]).reliability).toBe('medium');
    expect(analyzeConfidence([makeBoundedPrediction({ confidence: 0.5 })]).reliability).toBe('low');
    expect(analyzeConfidence([makeBoundedPrediction({ confidence: 0.1 })]).reliability).toBe('unreliable');
  });
});

describe('PredictionEngine', () => {
  it('predict returns PredictionResult', () => {
    const input: PredictionInput = {
      metricValues: {
        nodes: [
          { timestamp: '2024-01-01T00:00:00Z', value: 10 },
          { timestamp: '2024-01-02T00:00:00Z', value: 12 },
        ],
      },
      window: makeForecastWindow(),
      evidence: [makeEvidence()],
    };
    const engine = new PredictionEngine();
    const r = engine.predict(input);
    expect(r.predictions).toHaveLength(1);
    expect(r.confidence.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(r.id).toBeTruthy();
  });
});

describe('prediction utility functions', () => {
  it('rankPredictions ranks by confidence', () => {
    const predictions = [
      makeBoundedPrediction({ metricName: 'a', confidence: 0.8 }),
      makeBoundedPrediction({ metricName: 'b', confidence: 0.9 }),
    ];
    const ranked = rankPredictions(predictions);
    expect(ranked[0]!.metricName).toBe('b');
  });

  it('assessPredictionRisk returns risk', () => {
    const p = makeBoundedPrediction({ confidence: 0.8, lowerBound: 5, upperBound: 15 });
    const risk = assessPredictionRisk(p);
    expect(risk).toBeDefined();
  });

  it('createPredictionWindow creates window', () => {
    const w = createPredictionWindow('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 3, 0.8);
    expect(w).toBeDefined();
  });

  it('evaluatePredictionEvidence evaluates evidence', () => {
    const result = evaluatePredictionEvidence(makeBoundedPrediction({ metricName: 'nodes' }), [makeEvidence({ metricValues: { nodes: 10 } })]);
    expect(result.supported).toBe(true);
    expect(result.matchCount).toBe(1);
  });
});

/* ========================================================================== */
/*  12. Simulation                                                             */
/* ========================================================================== */

describe('bounded-simulation', () => {
  it('generateSimulationSteps creates steps', () => {
    const values = [
      { timestamp: '2024-01-01T00:00:00Z', value: 10 },
      { timestamp: '2024-01-02T00:00:00Z', value: 12 },
    ];
    const window = makeForecastWindow({ endTimestamp: '2024-01-05T00:00:00Z' });
    const steps = generateSimulationSteps('nodes', values, window, 3);
    expect(steps).toHaveLength(3);
    expect(steps[0]!.stepIndex).toBe(0);
    expect(steps[0]!.predictedValues['nodes']).toBeDefined();
    expect(steps[0]!.confidence).toBeGreaterThanOrEqual(0);
  });
});

describe('SimulationEngine', () => {
  it('simulate returns SimulationResult', () => {
    const input: SimulationInput = {
      scenarioName: 'growth',
      metrics: {
        nodes: [
          { timestamp: '2024-01-01T00:00:00Z', value: 10 },
          { timestamp: '2024-01-02T00:00:00Z', value: 12 },
        ],
      },
      window: makeForecastWindow({ endTimestamp: '2024-01-05T00:00:00Z' }),
      stepCount: 3,
    };
    const engine = new SimulationEngine();
    const r = engine.simulate(input);
    expect(r.scenarioName).toBe('growth');
    expect(r.steps).toHaveLength(3);
    expect(r.fingerprint).toBeTruthy();
  });
});

describe('simulation helper functions', () => {
  it('simulateDegradation returns steps', () => {
    const values = [{ timestamp: '2024-01-01T00:00:00Z', value: 0.1 }, { timestamp: '2024-01-02T00:00:00Z', value: 0.2 }];
    const result = simulateDegradation(values, makeForecastWindow(), 3);
    expect(result).toBeDefined();
  });

  it('simulatePropagation returns steps', () => {
    const values = [{ timestamp: '2024-01-01T00:00:00Z', value: 0.1 }, { timestamp: '2024-01-02T00:00:00Z', value: 0.2 }];
    const result = simulatePropagation(values, makeForecastWindow(), 3);
    expect(result).toBeDefined();
  });
});

/* ========================================================================== */
/*  13. Drift                                                                  */
/* ========================================================================== */

describe('temporal-drift', () => {
  it('computeTemporalDrift returns drift metrics', () => {
    const points = [
      makeEvolutionPoint({ driftScore: 0, timestamp: '2024-01-01T00:00:00Z' }),
      makeEvolutionPoint({ driftScore: 0.2, timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = computeTemporalDrift(points);
    expect(r.totalDrift).toBe(0.2);
    expect(r.driftVelocity).toBeGreaterThan(0);
    expect(r.driftLevel).toBe('low');
  });

  it('returns none for insufficient points', () => {
    const r = computeTemporalDrift([makeEvolutionPoint()]);
    expect(r.totalDrift).toBe(0);
    expect(r.driftLevel).toBe('none');
  });

  it('classifies drift levels correctly', () => {
    const base = makeEvolutionPoint({ driftScore: 0, timestamp: '2024-01-01T00:00:00Z' });
    expect(computeTemporalDrift([base, makeEvolutionPoint({ driftScore: 0.1, timestamp: '2024-01-02T00:00:00Z' })]).driftLevel).toBe('low');
    expect(computeTemporalDrift([base, makeEvolutionPoint({ driftScore: 0.4, timestamp: '2024-01-02T00:00:00Z' })]).driftLevel).toBe('moderate');
    expect(computeTemporalDrift([base, makeEvolutionPoint({ driftScore: 0.6, timestamp: '2024-01-02T00:00:00Z' })]).driftLevel).toBe('high');
    expect(computeTemporalDrift([base, makeEvolutionPoint({ driftScore: 0.8, timestamp: '2024-01-02T00:00:00Z' })]).driftLevel).toBe('critical');
  });
});

describe('drift analysis functions', () => {
  const points = [
    makeEvolutionPoint({ driftScore: 0, semanticScore: 1, timestamp: '2024-01-01T00:00:00Z' }),
    makeEvolutionPoint({ driftScore: 0.2, semanticScore: 0.8, timestamp: '2024-01-02T00:00:00Z' }),
  ];

  it('analyzeSemanticDriftEvolution', () => {
    const r = analyzeSemanticDriftEvolution(points);
    expect(r).toBeDefined();
  });

  it('analyzeDependencyDriftEvolution', () => {
    const r = analyzeDependencyDriftEvolution(points);
    expect(r).toBeDefined();
  });

  it('analyzeArchitectureDriftTrajectory returns trajectory', () => {
    const r = analyzeArchitectureDriftTrajectory(points);
    expect(r).toBeDefined();
  });

  it('analyzeDriftAcceleration', () => {
    const r = analyzeDriftAcceleration(points);
    expect(r).toBeDefined();
  });

  it('analyzeDriftPersistence', () => {
    const r = analyzeDriftPersistence(points);
    expect(r).toBeDefined();
  });

  it('compareDrifts compares drift results', () => {
    const r = compareDrifts(points);
    expect(r.dominantDrift).toBeDefined();
    expect(r.semanticDriftVelocity).toBeDefined();
  });
});

/* ========================================================================== */
/*  14. Remediation                                                            */
/* ========================================================================== */

describe('remediation-effectiveness', () => {
  it('analyzeRemediationEffectiveness computes metrics', () => {
    const records = [
      makeRemediationRecord({ successScore: 0.9, impactScore: 0.8, regressionScore: 0.1 }),
      makeRemediationRecord({ successScore: 0.5, impactScore: 0.4, regressionScore: 0.3 }),
    ];
    const r = analyzeRemediationEffectiveness(records);
    expect(r.successRate).toBe(0.5);
    expect(r.averageImpact).toBeCloseTo(0.6, 10);
    expect(r.averageRegression).toBe(0.2);
    expect(r.overallEffectiveness).toBeGreaterThan(0);
  });

  it('returns zeros for empty records', () => {
    const r = analyzeRemediationEffectiveness([]);
    expect(r.overallEffectiveness).toBe(0);
    expect(r.trend).toBe('stable');
  });
});

describe('remediation helper functions', () => {
  it('buildRemediationHistory builds history', () => {
    const records = [makeRemediationRecord()];
    const r = buildRemediationHistory(records);
    expect(r).toBeDefined();
  });

  it('detectRemediationRegressionFn detects regression', () => {
    const records = [
      makeRemediationRecord({ successScore: 0.9, regressionScore: 0.6 }),
      makeRemediationRecord({ successScore: 0.5, regressionScore: 0.4 }),
    ];
    const r = detectRemediationRegressionFn(records);
    expect(r.hasRegression).toBe(true);
    expect(r.regressionRate).toBe(0.5);
  });

  it('analyzeRemediationImpactTrajectory', () => {
    const records = [makeRemediationRecord()];
    const r = analyzeRemediationImpactTrajectory(records);
    expect(r).toBeDefined();
  });

  it('compareRemediationActions', () => {
    const r = compareRemediationActions([makeRemediationRecord(), makeRemediationRecord()]);
    expect(r).toBeDefined();
  });

  it('analyzeRemediationFailures', () => {
    const records = [makeRemediationRecord({ successScore: 0.3 })];
    const r = analyzeRemediationFailures(records);
    expect(r).toBeDefined();
  });

  it('analyzeRemediationSuccesses', () => {
    const records = [makeRemediationRecord({ successScore: 0.9 })];
    const r = analyzeRemediationSuccesses(records);
    expect(r).toBeDefined();
  });
});

/* ========================================================================== */
/*  15. Evidence                                                               */
/* ========================================================================== */

describe('temporal-evidence', () => {
  it('createTemporalEvidence creates evidence', () => {
    const e = createTemporalEvidence('trend', 'desc', ['snap_1'], { nodes: 10 }, 0.1, 0.8);
    expect(e.type).toBe('trend');
    expect(e.description).toBe('desc');
    expect(e.snapshotIds).toEqual(['snap_1']);
    expect(e.confidence).toBe(0.8);
  });

  it('clamps confidence to [0, 1]', () => {
    const e = createTemporalEvidence('t', 'd', [], {}, 0, 1.5);
    expect(e.confidence).toBe(1);
    const e2 = createTemporalEvidence('t', 'd', [], {}, 0, -0.5);
    expect(e2.confidence).toBe(0);
  });

  it('mergeEvidence merges multiple evidence', () => {
    const e1 = makeEvidence({ type: 'trend', snapshotIds: ['s1'], metricValues: { a: 1 }, confidence: 0.8, trajectorySlope: 0.1 });
    const e2 = makeEvidence({ type: 'forecast', snapshotIds: ['s2'], metricValues: { b: 2 }, confidence: 0.6, trajectorySlope: 0.3 });
    const merged = mergeEvidence([e1, e2]);
    expect(merged.type).toBe('merged');
    expect(merged.snapshotIds).toHaveLength(2);
    expect(merged.confidence).toBe(0.7);
  });
});

describe('evidence builder functions', () => {
  it('buildTrajectoryEvidence builds from trajectory', () => {
    const traj = makeMetricTrajectory({ metricName: 'nodes', points: [{ timestamp: '2024-01-01T00:00:00Z', value: 10 }] });
    const e = buildTrajectoryEvidence(traj, 0.8);
    expect(e.type).toBe('trajectory');
    expect(e.confidence).toBe(0.8);
  });

  it('buildForecastEvidence builds from forecast', () => {
    const fc = makeForecastResult();
    const e = buildForecastEvidence(fc, 0.8);
    expect(e).toBeDefined();
  });

  it('buildTrendEvidence builds from trend input', () => {
    const e = buildTrendEvidence({ trendType: 'nodes', direction: 'increasing', slope: 0.5, magnitude: 0.3, snapshotIds: ['s1'], metricValues: { nodes: 10 } });
    expect(e.type).toBe('trend_nodes');
    expect(e.confidence).toBeGreaterThan(0);
  });

  it('buildSimulationEvidence builds from simulation', () => {
    const sim = makeSimulationResult();
    const e = buildSimulationEvidence(sim, 0.8);
    expect(e).toBeDefined();
  });

  it('buildPredictionEvidence builds from predictions', () => {
    const e = buildPredictionEvidence(makeBoundedPrediction({ metricName: 'nodes', currentValue: 10, predictedValue: 12 }));
    expect(e.type).toBe('prediction');
    expect(e.metricValues['nodes']).toBe(12);
  });

  it('buildReplayEvidence builds from replay input', () => {
    const e = buildReplayEvidence({ replaySessionId: 'rep_1', divergenceScore: 0.05, determinismScore: 0.95, snapshotIds: ['s1'], metricValues: { nodes: 10 } });
    expect(e.type).toBe('replay');
    expect(e.confidence).toBe(0.95);
  });
});

/* ========================================================================== */
/*  16. Explainability                                                         */
/* ========================================================================== */

describe('temporal-explainer', () => {
  it('generateTemporalExplanation creates narrative', () => {
    const fc = makeForecastResult({
      predictions: [
        makeBoundedPrediction({ metricName: 'nodes', currentValue: 10, predictedValue: 12, confidence: 0.85 }),
      ],
      confidence: 0.85,
    });
    const exp = generateTemporalExplanation(fc);
    expect(exp.narrative).toContain('metrics');
    expect(exp.reasoningSteps).toHaveLength(3);
    expect(exp.confidence).toBe(0.85);
  });

  it('generateTrajectoryExplanation creates narrative', () => {
    const traj = makeTrajectoryResult({ degradationVelocity: 0.01, instabilityAcceleration: 0.02, hotspotGrowthRate: 0.03 });
    const exp = generateTrajectoryExplanation(traj);
    expect(exp.narrative).toContain('trajectories');
    expect(exp.reasoningSteps).toHaveLength(4);
  });
});

describe('explainer functions', () => {
  it('explainForecast returns forecast explanation', () => {
    const fc = makeForecastResult();
    const exp = explainForecast(fc);
    expect(exp).toBeDefined();
  });

  it('explainDegradation returns degradation explanation', () => {
    const exp = explainDegradation([makeMetricTrajectory({ metricName: 'complexity', slope: 0.001, acceleration: 0.0001 })]);
    expect(exp.summary).toContain('trajectories');
    expect(exp.factors).toHaveLength(1);
  });

  it('explainTrends returns trend explanation', () => {
    const exp = explainTrends([makeMetricTrajectory({ metricName: 'nodes', slope: 0.5, trend: 'increasing' })]);
    expect(exp.summary).toContain('trends');
    expect(exp.details).toHaveLength(1);
  });

  it('explainPredictions returns prediction explanation', () => {
    const exp = explainPredictions([makeBoundedPrediction()]);
    expect(exp).toBeDefined();
  });

  it('explainSimulation returns simulation explanation', () => {
    const sim = makeSimulationResult();
    const exp = explainSimulation(sim);
    expect(exp).toBeDefined();
  });
});

describe('evidence-renderer', () => {
  it('renderEvidence creates RenderedEvidence', () => {
    const e = makeEvidence({ type: 'trend', description: 'test evidence', metricValues: { nodes: 10 }, confidence: 0.8 });
    const r = renderEvidence(e);
    expect(r.type).toBe('trend');
    expect(r.summary).toBe('test evidence');
    expect(r.metricSummary).toContain('nodes=10.000');
    expect(r.confidenceLabel).toBe('high');
  });

  it('classifies confidence label correctly', () => {
    expect(renderEvidence(makeEvidence({ confidence: 0.9 })).confidenceLabel).toBe('high');
    expect(renderEvidence(makeEvidence({ confidence: 0.6 })).confidenceLabel).toBe('medium');
    expect(renderEvidence(makeEvidence({ confidence: 0.3 })).confidenceLabel).toBe('low');
  });

  it('renderEvidenceList renders multiple', () => {
    const list = renderEvidenceList([makeEvidence(), makeEvidence()]);
    expect(list).toHaveLength(2);
  });
});

describe('reasoning-chain', () => {
  it('buildReasoningChain creates chain from evidence', () => {
    const evidence = [
      makeEvidence({ type: 'trend', description: 'Step 1', confidence: 0.8 }),
      makeEvidence({ type: 'forecast', description: 'Step 2', confidence: 0.9 }),
    ];
    const chain = buildReasoningChain(evidence);
    expect(chain.steps).toHaveLength(2);
    expect(chain.steps[0]!.order).toBe(1);
    expect(chain.steps[1]!.order).toBe(2);
    expect(chain.overallConfidence).toBeCloseTo(0.85, 10);
  });

  it('handles empty evidence', () => {
    const chain = buildReasoningChain([]);
    expect(chain.steps).toEqual([]);
    expect(chain.overallConfidence).toBe(0);
  });
});

/* ========================================================================== */
/*  17. Replay                                                                 */
/* ========================================================================== */

describe('temporal-replay', () => {
  it('verifyReplayConsistency matches identical sequences', () => {
    const original = [
      makeSnapshot({ id: 's1', fingerprint: 'fp_1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', fingerprint: 'fp_2', timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const replayed = [
      makeSnapshot({ id: 's1', fingerprint: 'fp_1', timestamp: '2024-01-01T00:00:00Z' }),
      makeSnapshot({ id: 's2', fingerprint: 'fp_2', timestamp: '2024-01-02T00:00:00Z' }),
    ];
    const r = verifyReplayConsistency(original, replayed);
    expect(r.match).toBe(true);
    expect(r.fingerprint).toBeTruthy();
  });

  it('throws on count mismatch', () => {
    expect(() => verifyReplayConsistency(
      [makeSnapshot({ id: 's1' })],
      [makeSnapshot({ id: 's1' }), makeSnapshot({ id: 's2' })],
    )).toThrow(TemporalError);
  });

  it('throws on order mismatch', () => {
    expect(() => verifyReplayConsistency(
      [makeSnapshot({ id: 's1' }), makeSnapshot({ id: 's2' })],
      [makeSnapshot({ id: 's2' }), makeSnapshot({ id: 's1' })],
    )).toThrow(TemporalError);
  });
});

describe('forecast-replay', () => {
  it('verifyForecastReplay matches identical forecasts', () => {
    const a = makeForecastResult({ fingerprint: 'fp_123' });
    const b = makeForecastResult({ fingerprint: 'fp_123' });
    expect(verifyForecastReplay(a, b)).toBe(true);
  });

  it('throws on fingerprint mismatch', () => {
    expect(() => verifyForecastReplay(
      makeForecastResult({ fingerprint: 'fp_a' }),
      makeForecastResult({ fingerprint: 'fp_b' }),
    )).toThrow(TemporalError);
  });

  it('returns false on prediction count mismatch', () => {
    const a = makeForecastResult({ fingerprint: 'fp_x', predictions: [makeBoundedPrediction()] });
    const b = makeForecastResult({ fingerprint: 'fp_x', predictions: [makeBoundedPrediction(), makeBoundedPrediction()] });
    expect(verifyForecastReplay(a, b)).toBe(false);
  });
});

describe('deterministic-prediction', () => {
  it('deterministicPredict produces consistent predictions', () => {
    const values = [
      { timestamp: '2024-01-01T00:00:00Z', value: 10 },
      { timestamp: '2024-01-02T00:00:00Z', value: 12 },
    ];
    const window = makeForecastWindow();
    const a = deterministicPredict('nodes', values, window);
    const b = deterministicPredict('nodes', values, window);
    expect(a.predictedValue).toBe(b.predictedValue);
  });

  it('verifyDeterminism checks equality', () => {
    const a = makeBoundedPrediction({ metricName: 'nodes', predictedValue: 12, confidence: 0.8, lowerBound: 8, upperBound: 16 });
    const b = makeBoundedPrediction({ metricName: 'nodes', predictedValue: 12, confidence: 0.8, lowerBound: 8, upperBound: 16 });
    expect(verifyDeterminism(a, b)).toBe(true);
    expect(verifyDeterminism(a, { ...a, predictedValue: 13 })).toBe(false);
  });
});

describe('replay-comparison', () => {
  it('compareReplayResults compares all artifacts', () => {
    const snaps = [makeSnapshot({ id: 's1', fingerprint: 'fp_1' })];
    const fc = makeForecastResult({ fingerprint: 'fp_fc' });
    const traj = makeTrajectoryResult({ degradationVelocity: 0 });
    const sim = makeSimulationResult({ fingerprint: 'fp_sim' });
    const r = compareReplayResults(snaps, snaps, fc, fc, traj, traj, sim, sim);
    expect(r.snapshotsMatch).toBe(true);
    expect(r.forecastMatch).toBe(true);
    expect(r.trajectoryMatch).toBe(true);
    expect(r.simulationMatch).toBe(true);
    expect(r.allMatch).toBe(true);
  });
});

describe('forecast-fingerprint', () => {
  it('computeForecastFingerprint produces hash', () => {
    const fc = makeForecastResult({ projectId: 'proj_1' });
    const fp = computeForecastFingerprint(fc);
    expect(fp).toMatch(/^fp_/);
  });

  it('verifyFingerprint validates', () => {
    expect(verifyFingerprint(makeForecastResult({ fingerprint: 'fp_wrong' }))).toBe(false);
  });
});

describe('replay-validation', () => {
  it('validateReplayInput checks all artifacts', () => {
    const fc = makeForecastResult({ fingerprint: 'fp_fc' });
    const traj = makeTrajectoryResult();
    const sim = makeSimulationResult({ fingerprint: 'fp_sim' });
    const r = validateReplayInput(fc, traj, sim);
    expect(r.valid).toBe(true);
    expect(r.checks).toHaveLength(4);
  });

  it('fails for empty forecast fingerprint', () => {
    const r = validateReplayInput(
      makeForecastResult({ fingerprint: '' }),
      makeTrajectoryResult(),
      makeSimulationResult({ fingerprint: 'fp_sim' }),
    );
    expect(r.valid).toBe(false);
  });
});

/* ========================================================================== */
/*  18. Scoring                                                                */
/* ========================================================================== */

describe('degradation-scoring', () => {
  it('scoreDegradation computes score and level', () => {
    const r = scoreDegradation(0.3, 0.3, 0.3);
    expect(r.score).toBeCloseTo(0.3, 10);
    expect(r.level).toBe('low');
    expect(r.factors).toHaveLength(3);
  });

  it('classifies levels correctly', () => {
    expect(scoreDegradation(0.05, 0.05, 0.05).level).toBe('none');
    expect(scoreDegradation(0.3, 0.3, 0.3).level).toBe('low');
    expect(scoreDegradation(0.5, 0.5, 0.5).level).toBe('moderate');
    expect(scoreDegradation(0.7, 0.7, 0.7).level).toBe('severe');
    expect(scoreDegradation(0.9, 0.9, 0.9).level).toBe('critical');
  });
});

describe('trajectory-scoring', () => {
  it('scoreTrajectory computes overall score', () => {
    const metrics = [
      makeMetricTrajectory({ metricName: 'nodes', slope: 1, trend: 'increasing' }),
      makeMetricTrajectory({ metricName: 'edges', slope: -1, trend: 'decreasing' }),
    ];
    const r = scoreTrajectory(metrics);
    expect(r.overallScore).toBeGreaterThan(0);
    expect(r.metricScores).toHaveLength(2);
  });

  it('handles empty metrics', () => {
    expect(scoreTrajectory([]).overallScore).toBe(0);
  });
});

describe('prediction-scoring', () => {
  it('scorePrediction computes reliability', () => {
    const p = makeBoundedPrediction({ confidence: 0.9, predictedValue: 100, lowerBound: 80, upperBound: 120 });
    const r = scorePrediction(p);
    expect(r.reliability).toBeGreaterThan(0);
    expect(r.spread).toBeLessThan(1);
  });

  it('scorePredictions scores all', () => {
    const results = scorePredictions([makeBoundedPrediction(), makeBoundedPrediction()]);
    expect(results).toHaveLength(2);
  });
});

describe('trend-priority', () => {
  it('prioritizeTrends ranks by severity', () => {
    const trajectories = [
      makeMetricTrajectory({ metricName: 'a', slope: 1, trend: 'increasing' }),
      makeMetricTrajectory({ metricName: 'b', slope: 0.1, trend: 'stable' }),
    ];
    const r = prioritizeTrends(trajectories);
    expect(r[0]!.priority).toBeGreaterThanOrEqual(r[1]!.priority);
  });
});

describe('hotspot-priority', () => {
  it('prioritizeHotspots ranks by intensity/risk', () => {
    const hotspots = [
      makeHotspotPoint({ modulePath: 'a', intensity: 0.9, riskScore: 0.8, affectedModules: 10 }),
      makeHotspotPoint({ modulePath: 'b', intensity: 0.1, riskScore: 0.1, affectedModules: 1 }),
    ];
    const r = prioritizeHotspots(hotspots);
    expect(r[0]!.modulePath).toBe('a');
  });
});

describe('remediation-priority', () => {
  it('prioritizeRemediations ranks by effectiveness', () => {
    const records = [
      makeRemediationRecord({ id: 'a', successScore: 0.9, impactScore: 0.8, regressionScore: 0.1 }),
      makeRemediationRecord({ id: 'b', successScore: 0.3, impactScore: 0.2, regressionScore: 0.5 }),
    ];
    const r = prioritizeRemediations(records);
    expect(r[0]!.remediationId).toBe('a');
  });
});

describe('operational-risk-priority', () => {
  it('scoreOperationalRisk computes risks', () => {
    const trajectories = [
      makeMetricTrajectory({ metricName: 'instability', slope: 0.05, trend: 'increasing' }),
      makeMetricTrajectory({ metricName: 'coupling', slope: -0.02, trend: 'decreasing' }),
    ];
    const hotspots = [makeHotspotPoint({ intensity: 0.6 })];
    const r = scoreOperationalRisk(trajectories, hotspots);
    expect(r.length).toBeGreaterThanOrEqual(3);
    r.forEach((item) => {
      expect(['low', 'medium', 'high', 'critical']).toContain(item.priority);
    });
  });

  it('handles empty inputs', () => {
    const r = scoreOperationalRisk([], []);
    expect(r).toEqual([]);
  });
});

/* ========================================================================== */
/*  19. Serialization                                                          */
/* ========================================================================== */

describe('serialization', () => {
  it('serializeSnapshot / deserializeSnapshot round-trip', () => {
    const s = makeSnapshot();
    const json = serializeSnapshot(s);
    const back = deserializeSnapshot(json);
    expect(back).toEqual(s);
  });

  it('serializeForecast / deserializeForecast round-trip', () => {
    const fc = makeForecastResult();
    const json = serializeForecast(fc);
    const back = deserializeForecast(json);
    expect(back).toEqual(fc);
  });

  it('serializeTrajectory / deserializeTrajectory round-trip', () => {
    const t = makeTrajectoryResult();
    const json = serializeTrajectory(t);
    const back = deserializeTrajectory(json);
    expect(back).toEqual(t);
  });

  it('serializeSimulation / deserializeSimulation round-trip', () => {
    const s = makeSimulationResult();
    const json = serializeSimulation(s);
    const back = deserializeSimulation(json);
    expect(back).toEqual(s);
  });

  it('serializeEvolutionPoint / deserializeEvolutionPoint round-trip', () => {
    const p = makeEvolutionPoint();
    const json = serializeEvolutionPoint(p);
    const back = deserializeEvolutionPoint(json);
    expect(back).toEqual(p);
  });

  describe('canonicalization', () => {
    it('canonicalizeSnapshot returns snapshot with sorted keys', () => {
      const result = canonicalizeSnapshot(makeSnapshot());
      expect(result.id).toBe('snap_1');
      expect(result.projectId).toBe('proj_1');
    });

    it('canonicalizeForecast returns forecast with sorted keys', () => {
      const result = canonicalizeForecast(makeForecastResult());
      expect(result.id).toBe('fc_1');
      expect(result.predictions).toHaveLength(1);
    });

    it('canonicalizePrediction returns prediction with sorted keys', () => {
      const result = canonicalizePrediction(makeBoundedPrediction());
      expect(result.metricName).toBe('nodes');
      expect(result.predictedValue).toBe(12);
    });
  });
});

/* ========================================================================== */
/*  20. Validation                                                             */
/* ========================================================================== */

describe('forecast-validator', () => {
  it('validateForecast passes valid forecast', () => {
    const r = validateForecast(makeForecastResult());
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects forecast with missing id', () => {
    const r = validateForecast(makeForecastResult({ id: '' }));
    expect(r.valid).toBe(false);
    expect(r.errors).toContain('Missing forecast id');
  });

  it('rejects forecast with missing projectId', () => {
    const r = validateForecast(makeForecastResult({ projectId: '' }));
    expect(r.valid).toBe(false);
  });

  it('rejects forecast with no predictions', () => {
    const r = validateForecast(makeForecastResult({ predictions: [] }));
    expect(r.valid).toBe(false);
  });

  it('rejects forecast with out-of-range confidence', () => {
    const r = validateForecast(makeForecastResult({ confidence: 1.5 }));
    expect(r.valid).toBe(false);
  });

  it('rejects prediction with invalid bounds', () => {
    const r = validateForecast(makeForecastResult({
      predictions: [makeBoundedPrediction({ lowerBound: 10, upperBound: 5 })],
    }));
    expect(r.valid).toBe(false);
  });
});

describe('prediction-validator', () => {
  it('validatePrediction passes valid prediction', () => {
    const r = validatePrediction(makeBoundedPrediction());
    expect(r.valid).toBe(true);
  });

  it('rejects prediction with missing metricName', () => {
    expect(validatePrediction(makeBoundedPrediction({ metricName: '' })).valid).toBe(false);
  });

  it('rejects prediction with invalid confidence', () => {
    expect(validatePrediction(makeBoundedPrediction({ confidence: -0.1 })).valid).toBe(false);
    expect(validatePrediction(makeBoundedPrediction({ confidence: 1.1 })).valid).toBe(false);
  });

  it('rejects prediction with negative horizonMs', () => {
    expect(validatePrediction(makeBoundedPrediction({ horizonMs: -1 })).valid).toBe(false);
  });

  it('rejects prediction with invalid bounds order', () => {
    expect(validatePrediction(makeBoundedPrediction({ lowerBound: 50, upperBound: 10 })).valid).toBe(false);
  });

  it('validatePredictions batch validates', () => {
    const results = validatePredictionsBatch([makeBoundedPrediction(), makeBoundedPrediction()]);
    expect(results).toHaveLength(2);
    expect(results[0]!.valid).toBe(true);
  });
});

describe('determinism-validator', () => {
  it('validatePredictionDeterminism passes for identical predictions', () => {
    const p = makeBoundedPrediction();
    const r = validatePredictionDeterminism(p, { ...p });
    expect(r.deterministic).toBe(true);
  });

  it('detects mismatches', () => {
    const a = makeBoundedPrediction({ predictedValue: 10 });
    const b = makeBoundedPrediction({ predictedValue: 20 });
    const r = validatePredictionDeterminism(a, b);
    expect(r.deterministic).toBe(false);
    expect(r.mismatches.length).toBeGreaterThan(0);
  });

  it('validateForecastDeterminism passes for identical forecasts', () => {
    const fc = makeForecastResult();
    const r = validateForecastDeterminism(fc, { ...fc });
    expect(r.deterministic).toBe(true);
  });

  it('detects fingerprint mismatch', () => {
    const r = validateForecastDeterminism(
      makeForecastResult({ fingerprint: 'a' }),
      makeForecastResult({ fingerprint: 'b' }),
    );
    expect(r.deterministic).toBe(false);
  });
});

describe('replay-validator', () => {
  it('validateReplaySnapshots passes valid snapshots', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_1' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z', fingerprint: 'fp_2' }),
    ];
    const r = validateReplaySnapshots(snaps);
    expect(r.valid).toBe(true);
  });

  it('rejects empty snapshots', () => {
    expect(validateReplaySnapshots([]).valid).toBe(false);
  });

  it('rejects duplicate ids', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_1' }),
      makeSnapshot({ id: 's1', timestamp: '2024-01-02T00:00:00Z', fingerprint: 'fp_2' }),
    ];
    expect(validateReplaySnapshots(snaps).valid).toBe(false);
  });

  it('rejects out-of-order timestamps', () => {
    const snaps = [
      makeSnapshot({ id: 's1', timestamp: '2024-01-02T00:00:00Z', fingerprint: 'fp_1' }),
      makeSnapshot({ id: 's2', timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_2' }),
    ];
    expect(validateReplaySnapshots(snaps).valid).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(validateReplaySnapshots([makeSnapshot({ id: '' })]).valid).toBe(false);
    expect(validateReplaySnapshots([makeSnapshot({ timestamp: '' })]).valid).toBe(false);
    expect(validateReplaySnapshots([makeSnapshot({ fingerprint: '' })]).valid).toBe(false);
  });
});

describe('simulation-validator', () => {
  it('validateSimulation passes valid simulation', () => {
    const r = validateSimulationBatch(makeSimulationResult());
    expect(r.isValid).toBe(true);
  });

  it('rejects non-finite predicted values', () => {
    const r = validateSimulationBatch(makeSimulationResult({
      steps: [makeSimulationStep({ predictedValues: { nodes: Infinity } })],
    }));
    expect(r.isValid).toBe(false);
  });
});

describe('temporal-integrity-validator', () => {
  const snaps = [
    makeSnapshot({ id: 's1', timestamp: '2024-01-01T00:00:00Z' }),
    makeSnapshot({ id: 's2', timestamp: '2024-01-02T00:00:00Z' }),
  ];
  const evPoints = [
    makeEvolutionPoint({ snapshotId: 's1', timestamp: '2024-01-01T00:00:00Z' }),
    makeEvolutionPoint({ snapshotId: 's2', timestamp: '2024-01-02T00:00:00Z' }),
  ];

  it('passes for valid data', () => {
    const r = validateTemporalIntegrity(snaps, evPoints);
    expect(r.valid).toBe(true);
  });

  it('detects missing snapshot references', () => {
    const r = validateTemporalIntegrity(snaps, [
      ...evPoints,
      makeEvolutionPoint({ snapshotId: 's3' }),
    ]);
    expect(r.valid).toBe(false);
    expect(r.issues[0]).toContain('s3');
  });

  it('detects snapshots without evolution points', () => {
    const r = validateTemporalIntegrity(
      [...snaps, makeSnapshot({ id: 's3', timestamp: '2024-01-03T00:00:00Z' })],
      evPoints,
    );
    expect(r.valid).toBe(false);
    expect(r.issues[0]).toContain('s3');
  });

  it('detects out-of-order timestamps in snapshots', () => {
    const badSnaps = [snaps[1]!, snaps[0]!];
    const r = validateTemporalIntegrity(badSnaps, evPoints);
    expect(r.valid).toBe(false);
  });
});

/* ========================================================================== */
/*  21. Telemetry                                                              */
/* ========================================================================== */

describe('TemporalTelemetry', () => {
  let telemetry: TemporalTelemetry;

  beforeEach(() => {
    telemetry = new TemporalTelemetry();
  });

  it('starts empty', () => {
    expect(telemetry.getEvents()).toEqual([]);
    const stats = telemetry.getStats();
    expect(stats.count).toBe(0);
  });

  it('record adds events', () => {
    telemetry.record('forecast', 100, true, { metric: 'nodes' });
    expect(telemetry.getEvents()).toHaveLength(1);
    expect(telemetry.getEvents()[0]!.type).toBe('forecast');
    expect(telemetry.getEvents()[0]!.durationMs).toBe(100);
    expect(telemetry.getEvents()[0]!.success).toBe(true);
  });

  it('getEvents filters by type', () => {
    telemetry.record('forecast', 100, true);
    telemetry.record('simulation', 200, true);
    expect(telemetry.getEvents('forecast')).toHaveLength(1);
  });

  it('getStats computes metrics', () => {
    telemetry.record('forecast', 100, true);
    telemetry.record('forecast', 200, false);
    const stats = telemetry.getStats('forecast');
    expect(stats.count).toBe(2);
    expect(stats.successRate).toBe(0.5);
    expect(stats.avgDurationMs).toBe(150);
  });

  it('getStats returns zeros for unknown type', () => {
    const stats = telemetry.getStats('nonexistent');
    expect(stats.count).toBe(0);
    expect(stats.avgDurationMs).toBe(0);
  });

  it('limits events to 1000', () => {
    for (let i = 0; i < 1050; i++) {
      telemetry.record('test', i, true);
    }
    expect(telemetry.getEvents().length).toBe(1000);
  });
});

/* ========================================================================== */
/*  22. Audit                                                                  */
/* ========================================================================== */

describe('forecast-audit', () => {
  it('auditForecast produces audit entries', () => {
    const fc = makeForecastResult();
    const entries = auditForecast(fc);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.check).toBe('forecast_determinism');
    expect(entries[1]!.check).toBe('forecast_boundedness');
    expect(entries[2]!.check).toBe('forecast_evidence');
  });

  it('checks fingerprint presence', () => {
    const entries = auditForecast(makeForecastResult({ fingerprint: '' }));
    expect(entries[0]!.passed).toBe(false);
  });
});

describe('determinism-audit', () => {
  it('auditDeterminism checks equality', () => {
    const entries = auditDeterminism('test', 10, 10);
    expect(entries[0]!.passed).toBe(true);
    const fail = auditDeterminism('test', 10, 20);
    expect(fail[0]!.passed).toBe(false);
  });

  it('auditDeterminismBatch checks multiple', () => {
    const checks = [
      { label: 'a', original: 1, replayed: 1 },
      { label: 'b', original: 2, replayed: 3 },
    ];
    const entries = auditDeterminismBatch(checks);
    expect(entries[0]!.passed).toBe(true);
    expect(entries[1]!.passed).toBe(false);
  });
});

describe('simulation-audit', () => {
  it('auditSimulation produces entries', () => {
    const sim = makeSimulationResult();
    const entries = auditSimulation(sim);
    expect(entries.length).toBeGreaterThanOrEqual(3);
    expect(entries[0]!.check).toBe('simulation_fingerprint');
  });

  it('checks step confidence range', () => {
    const sim = makeSimulationResult({
      steps: [makeSimulationStep({ confidence: 0.5 }), makeSimulationStep({ confidence: 1.5 })],
    });
    const entries = auditSimulation(sim);
    const lastCheck = entries[entries.length - 1]!;
    expect(lastCheck.passed).toBe(false);
  });
});

describe('prediction-audit', () => {
  it('auditPrediction produces entries', () => {
    const p = makeBoundedPrediction();
    const entries = auditPrediction(p);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.passed).toBe(true);
    expect(entries[1]!.passed).toBe(true);
    expect(entries[2]!.passed).toBe(true);
  });

  it('auditPredictions audits all', () => {
    const entries = auditPredictions([makeBoundedPrediction(), makeBoundedPrediction()]);
    expect(entries).toHaveLength(6);
  });
});

describe('degradation-audit', () => {
  it('auditDegradation checks score validity', () => {
    const score: DegradationScore = { score: 0.5, level: 'moderate', factors: [{ name: 'erosion', contribution: 1 }] };
    const entries = auditDegradation(score);
    expect(entries[0]!.passed).toBe(true);
    expect(entries[1]!.passed).toBe(true);
  });

  it('checks factor contributions are finite', () => {
    const score: DegradationScore = { score: 0.5, level: 'moderate', factors: [{ name: 'erosion', contribution: Infinity }] };
    const entries = auditDegradation(score);
    expect(entries[2]!.passed).toBe(false);
  });
});

describe('replay-audit', () => {
  it('auditReplayCheck compares values', () => {
    const check: ReplayAuditCheck = { name: 'score', original: 10, replayed: 10 };
    const entry = auditReplayCheck(check);
    expect(entry.passed).toBe(true);
  });

  it('auditReplayBatch processes multiple', () => {
    const checks: ReplayAuditCheck[] = [
      { name: 'a', original: 1, replayed: 1 },
      { name: 'b', original: 2, replayed: 3 },
    ];
    const entries = auditReplayBatch(checks);
    expect(entries[0]!.passed).toBe(true);
    expect(entries[1]!.passed).toBe(false);
  });
});

describe('evidence-audit', () => {
  it('auditEvidence checks evidence fields', () => {
    const e = makeEvidence();
    const entries = auditEvidence(e);
    expect(entries).toHaveLength(3);
    expect(entries[0]!.passed).toBe(true);
    expect(entries[1]!.passed).toBe(true);
    expect(entries[2]!.passed).toBe(true);
  });

  it('fails for empty snapshotIds', () => {
    const entries = auditEvidence(makeEvidence({ snapshotIds: [] }));
    expect(entries[0]!.passed).toBe(false);
  });

  it('auditEvidenceBatch processes all', () => {
    const entries = auditEvidenceBatch([makeEvidence(), makeEvidence()]);
    expect(entries).toHaveLength(6);
  });
});

describe('explainability-audit', () => {
  it('auditExplainability returns entries and report', () => {
    const fc = makeForecastResult();
    const traj = makeTrajectoryResult();
    const { entries, report } = auditExplainability(fc, traj);
    expect(entries).toHaveLength(4);
    expect(report.forecastRationale).toContain(fc.id);
    expect(report.trajectoryRationale).toContain(traj.id);
    expect(report.confidenceRationale).toContain(String(fc.confidence));
  });
});

/* ========================================================================== */
/*  23. Persistence                                                            */
/* ========================================================================== */

describe('TimelineRepository', () => {
  let repo: TimelineRepository;

  beforeEach(() => {
    repo = new TimelineRepository();
  });

  it('save and findById', () => {
    const record: TimelineRecord = { id: 't1', projectId: 'proj_1', snapshotId: 's1', sequenceIndex: 0, timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_1', metadata: '{}' };
    repo.save(record);
    expect(repo.findById('t1')).toEqual(record);
    expect(repo.findById('nonexistent')).toBeNull();
  });

  it('findByProjectId returns sorted records', () => {
    repo.save({ id: 't2', projectId: 'proj_1', snapshotId: 's2', sequenceIndex: 1, timestamp: '2024-01-02T00:00:00Z', fingerprint: 'fp_2', metadata: '{}' });
    repo.save({ id: 't1', projectId: 'proj_1', snapshotId: 's1', sequenceIndex: 0, timestamp: '2024-01-01T00:00:00Z', fingerprint: 'fp_1', metadata: '{}' });
    const found = repo.findByProjectId('proj_1');
    expect(found).toHaveLength(2);
    expect(found[0]!.sequenceIndex).toBe(0);
  });

  it('deleteByProjectId removes records', () => {
    repo.save({ id: 't1', projectId: 'proj_1', snapshotId: 's1', sequenceIndex: 0, timestamp: '', fingerprint: '', metadata: '' });
    repo.deleteByProjectId('proj_1');
    expect(repo.findByProjectId('proj_1')).toEqual([]);
  });
});

describe('ForecastRepository', () => {
  let repo: ForecastRepository;

  beforeEach(() => {
    repo = new ForecastRepository();
  });

  it('save and findById', () => {
    const record: ForecastRecord = { id: 'f1', projectId: 'proj_1', windowStart: '2024-01-01T00:00:00Z', windowEnd: '2024-01-02T00:00:00Z', predictionsJson: '[]', evidenceJson: '[]', confidence: 0.8, fingerprint: 'fp_1', createdAt: '2024-01-01T00:00:00Z' };
    repo.save(record);
    expect(repo.findById('f1')).toEqual(record);
  });

  it('findByFingerprint finds record', () => {
    repo.save({ id: 'f1', projectId: 'proj_1', windowStart: '', windowEnd: '', predictionsJson: '', evidenceJson: '', confidence: 0, fingerprint: 'fp_x', createdAt: '' });
    expect(repo.findByFingerprint('fp_x')).not.toBeNull();
    expect(repo.findByFingerprint('nonexistent')).toBeNull();
  });

  it('findByProjectId returns sorted by createdAt desc', () => {
    repo.save({ id: 'f1', projectId: 'proj_1', windowStart: '', windowEnd: '', predictionsJson: '', evidenceJson: '', confidence: 0, fingerprint: '', createdAt: '2024-01-01T00:00:00Z' });
    repo.save({ id: 'f2', projectId: 'proj_1', windowStart: '', windowEnd: '', predictionsJson: '', evidenceJson: '', confidence: 0, fingerprint: '', createdAt: '2024-01-02T00:00:00Z' });
    const found = repo.findByProjectId('proj_1');
    expect(found[0]!.id).toBe('f2');
  });
});

describe('PredictionRepository', () => {
  let repo: PredictionRepository;

  beforeEach(() => {
    repo = new PredictionRepository();
  });

  it('save and findById', () => {
    const record: PredictionRecord = { id: 'p1', projectId: 'proj_1', metricName: 'nodes', predictedValue: 12, lowerBound: 8, upperBound: 16, confidence: 0.8, horizonMs: 86400000, createdAt: '2024-01-01T00:00:00Z' };
    repo.save(record);
    expect(repo.findById('p1')).toEqual(record);
  });

  it('findByMetricName filters by project and metric', () => {
    repo.save({ id: 'p1', projectId: 'proj_1', metricName: 'nodes', predictedValue: 12, lowerBound: 8, upperBound: 16, confidence: 0.8, horizonMs: 86400000, createdAt: '2024-01-01T00:00:00Z' });
    repo.save({ id: 'p2', projectId: 'proj_1', metricName: 'edges', predictedValue: 18, lowerBound: 10, upperBound: 20, confidence: 0.7, horizonMs: 86400000, createdAt: '2024-01-01T00:00:00Z' });
    const found = repo.findByMetricName('proj_1', 'nodes');
    expect(found).toHaveLength(1);
  });
});

describe('DegradationRepository', () => {
  let repo: DegradationRepository;

  beforeEach(() => {
    repo = new DegradationRepository();
  });

  it('save and findById', () => {
    const record: DegradationRecord = { id: 'd1', projectId: 'proj_1', erosionScore: 0.2, fragmentationScore: 0.3, fatigueScore: 0.1, overallScore: 0.2, degradationLevel: 'low', createdAt: '2024-01-01T00:00:00Z' };
    repo.save(record);
    expect(repo.findById('d1')).toEqual(record);
  });

  it('deleteByProjectId removes records', () => {
    repo.save({ id: 'd1', projectId: 'proj_1', erosionScore: 0, fragmentationScore: 0, fatigueScore: 0, overallScore: 0, degradationLevel: '', createdAt: '' });
    repo.deleteByProjectId('proj_1');
    expect(repo.findById('d1')).toBeNull();
  });
});

describe('SimulationRepository', () => {
  let repo: SimulationRepository;

  beforeEach(() => {
    repo = new SimulationRepository();
  });

  it('save and findById', () => {
    const record: SimulationRecord = { id: 's1', projectId: 'proj_1', scenarioName: 'growth', stepsJson: '[]', boundsJson: '{}', fingerprint: 'fp_1', createdAt: '2024-01-01T00:00:00Z' };
    repo.save(record);
    expect(repo.findById('s1')).toEqual(record);
  });

  it('findByFingerprint', () => {
    repo.save({ id: 's1', projectId: 'proj_1', scenarioName: '', stepsJson: '', boundsJson: '', fingerprint: 'fp_x', createdAt: '' });
    expect(repo.findByFingerprint('fp_x')).not.toBeNull();
  });
});

describe('TemporalPersistence', () => {
  it('initializes all repositories', () => {
    const tp = new TemporalPersistence();
    expect(tp.timelines).toBeInstanceOf(TimelineRepository);
    expect(tp.forecasts).toBeInstanceOf(ForecastRepository);
    expect(tp.predictions).toBeInstanceOf(PredictionRepository);
    expect(tp.degradations).toBeInstanceOf(DegradationRepository);
    expect(tp.simulations).toBeInstanceOf(SimulationRepository);
  });

  it('clear resets all repositories', () => {
    const tp = new TemporalPersistence();
    tp.timelines.save({ id: 't1', projectId: 'p', snapshotId: '', sequenceIndex: 0, timestamp: '', fingerprint: '', metadata: '' });
    tp.clear();
    expect(tp.timelines.findById('t1')).toBeNull();
  });
});
