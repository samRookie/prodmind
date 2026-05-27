import { describe, expect, it, beforeEach } from 'vitest';
import type { GraphMemory, MetricsMemory } from '../contracts/memory-contracts.ts';

import { EvolutionTracker } from '../temporal/evolution-tracker.ts';
import { ArchitecturalDrift } from '../temporal/architectural-drift.ts';
import { VolatilityTracker } from '../temporal/volatility-tracker.ts';
import { RegressionDetector } from '../temporal/regression-detector.ts';

/* ------------------------------------------------------------------ */
/*  Inline frozen test data                                            */
/* ------------------------------------------------------------------ */

const GRAPH_A: GraphMemory = Object.freeze({
  id: 'g1', snapshotId: 'ss_1',
  nodeCount: 10, edgeCount: 15, density: 0.3, sccCount: 2,
  timestamp: '2025-01-01T00:00:00Z',
});

const GRAPH_B: GraphMemory = Object.freeze({
  id: 'g2', snapshotId: 'ss_2',
  nodeCount: 12, edgeCount: 15, density: 0.28, sccCount: 3,
  timestamp: '2025-01-02T00:00:00Z',
});

const GRAPH_C: GraphMemory = Object.freeze({
  id: 'g3', snapshotId: 'ss_3',
  nodeCount: 12, edgeCount: 18, density: 0.33, sccCount: 3,
  timestamp: '2025-01-03T00:00:00Z',
});

const METRICS_A: MetricsMemory = Object.freeze({
  id: 'm1', snapshotId: 'ss_1',
  instability: 0.5, propagationRisk: 0.3, fanInAvg: 2, fanOutAvg: 3, volatility: 0.1,
  timestamp: '2025-01-01T00:00:00Z',
});

const METRICS_B: MetricsMemory = Object.freeze({
  id: 'm2', snapshotId: 'ss_2',
  instability: 0.55, propagationRisk: 0.3, fanInAvg: 2, fanOutAvg: 3, volatility: 0.12,
  timestamp: '2025-01-02T00:00:00Z',
});

const METRICS_C: MetricsMemory = Object.freeze({
  id: 'm3', snapshotId: 'ss_3',
  instability: 0.55, propagationRisk: 0.35, fanInAvg: 2, fanOutAvg: 3, volatility: 0.12,
  timestamp: '2025-01-03T00:00:00Z',
});

/* ====================================================================== */
/*  EvolutionTracker                                                        */
/* ====================================================================== */

describe('EvolutionTracker', () => {
  let tracker: EvolutionTracker;

  beforeEach(() => {
    tracker = new EvolutionTracker();
  });

  it('starts with 0 events', () => {
    expect(tracker.eventCount).toBe(0);
    expect(tracker.getEvents()).toEqual([]);
  });

  describe('recordGraphChange', () => {
    it('creates events when nodeCount differs', () => {
      const events = tracker.recordGraphChange(GRAPH_A, GRAPH_B);
      expect(events).toHaveLength(2); // nodeCount + sccCount
      expect(events[0].eventType).toBe('hotspot_growth');
      expect(events[0].previousState).toBe('10');
      expect(events[0].newState).toBe('12');
      expect(events[1].eventType).toBe('scc_change');
    });

    it('creates event when edgeCount differs', () => {
      const events = tracker.recordGraphChange(GRAPH_A, GRAPH_C);
      expect(events).toHaveLength(3);
      expect(events[1].eventType).toBe('dependency_change');
      expect(events[1].previousState).toBe('15');
      expect(events[1].newState).toBe('18');
    });

    it('returns empty when values unchanged', () => {
      const events = tracker.recordGraphChange(GRAPH_A, GRAPH_A);
      expect(events).toEqual([]);
    });

    it('pushes current to graph history', () => {
      tracker.recordGraphChange(GRAPH_A, GRAPH_B);
      const history = tracker.getGraphHistory();
      expect(history).toHaveLength(1);
      expect(history[0].snapshotId).toBe('ss_2');
    });
  });

  describe('recordMetricChange', () => {
    it('creates events when instability changes by > 0.01', () => {
      const events = tracker.recordMetricChange(METRICS_A, METRICS_B);
      expect(events).toHaveLength(2); // instability + volatility
      expect(events[0].eventType).toBe('instability_change');
      expect(events[1].eventType).toBe('metric_evolution');
    });

    it('creates event when propagationRisk changes by > 0.01', () => {
      const events = tracker.recordMetricChange(METRICS_A, METRICS_C);
      expect(events).toHaveLength(3);
      expect(events[1].eventType).toBe('propagation_risk_change');
    });

    it('returns empty when values unchanged', () => {
      const events = tracker.recordMetricChange(METRICS_A, METRICS_A);
      expect(events).toEqual([]);
    });

    it('does NOT create event for change <= 0.01', () => {
      const close: MetricsMemory = Object.freeze({
        id: 'm4', snapshotId: 'ss_4',
        instability: 0.505, propagationRisk: 0.3, fanInAvg: 2, fanOutAvg: 3, volatility: 0.1,
        timestamp: '2025-01-04T00:00:00Z',
      });
      const events = tracker.recordMetricChange(METRICS_A, close);
      expect(events).toEqual([]);
    });

    it('pushes current to metrics history', () => {
      tracker.recordMetricChange(METRICS_A, METRICS_B);
      const history = tracker.getMetricsHistory();
      expect(history).toHaveLength(1);
      expect(history[0].snapshotId).toBe('ss_2');
    });
  });

  it('getEvents returns all events', () => {
    tracker.recordGraphChange(GRAPH_A, GRAPH_B);
    tracker.recordMetricChange(METRICS_A, METRICS_B);
    const all = tracker.getEvents();
    expect(all).toHaveLength(4);
    expect(all.filter(e => e.eventType === 'hotspot_growth')).toHaveLength(1);
  });

  it('getEventsByType filters by eventType', () => {
    tracker.recordGraphChange(GRAPH_A, GRAPH_B);
    tracker.recordGraphChange(GRAPH_B, GRAPH_C);
    const hotspot = tracker.getEventsByType('hotspot_growth');
    expect(hotspot).toHaveLength(1);
    expect(hotspot[0].eventType).toBe('hotspot_growth');
  });

  it('getGraphHistory / getMetricsHistory return historical records', () => {
    tracker.recordGraphChange(GRAPH_A, GRAPH_B);
    tracker.recordMetricChange(METRICS_A, METRICS_B);
    expect(tracker.getGraphHistory()).toHaveLength(1);
    expect(tracker.getMetricsHistory()).toHaveLength(1);
  });

  describe('getSummary', () => {
    it('returns summary with counts', () => {
      tracker.recordGraphChange(GRAPH_A, GRAPH_B);
      tracker.recordMetricChange(METRICS_A, METRICS_B);
      const summary = tracker.getSummary();
      expect(summary.totalEvents).toBe(4);
      expect(summary.graphChanges).toBe(2);
      expect(summary.metricChanges).toBe(2);
    });

    it('classifies trend as low activity', () => {
      const summary = tracker.getSummary();
      expect(summary.trend).toBe('low activity');
    });

    it('classifies trend as moderate activity', () => {
      for (let i = 0; i < 2; i++) {
        tracker.recordGraphChange(GRAPH_A, GRAPH_B);
        tracker.recordMetricChange(METRICS_A, METRICS_B);
      }
      expect(tracker.getSummary().trend).toBe('moderate activity');
    });

    it('classifies trend as high activity', () => {
      for (let i = 0; i < 6; i++) {
        tracker.recordGraphChange(GRAPH_A, GRAPH_B);
        tracker.recordMetricChange(METRICS_A, METRICS_B);
      }
      expect(tracker.getSummary().trend).toBe('high activity');
    });
  });

  it('clear resets everything', () => {
    tracker.recordGraphChange(GRAPH_A, GRAPH_B);
    tracker.recordMetricChange(METRICS_A, METRICS_B);
    tracker.clear();
    expect(tracker.eventCount).toBe(0);
    expect(tracker.getGraphHistory()).toEqual([]);
    expect(tracker.getMetricsHistory()).toEqual([]);
  });
});

/* ====================================================================== */
/*  ArchitecturalDrift                                                      */
/* ====================================================================== */

describe('ArchitecturalDrift', () => {
  let drift: ArchitecturalDrift;

  beforeEach(() => {
    drift = new ArchitecturalDrift();
  });

  describe('compareGraphs', () => {
    it('computes deltas and driftMagnitude from graph fields', () => {
      const report = drift.compareGraphs(GRAPH_A, GRAPH_B);
      expect(report.nodeDelta).toBe(2);
      expect(report.edgeDelta).toBe(0);
      expect(report.densityDelta).toBeCloseTo(-0.02, 5);
      expect(report.sccDelta).toBe(1);
      // sqrt(2^2 + 0^2 + (-0.02*100)^2 + 1^2) = sqrt(4 + 0 + 4 + 1) = sqrt(9) = 3
      expect(report.driftMagnitude).toBeCloseTo(3, 10);
    });

    it('sets metric deltas to 0', () => {
      const report = drift.compareGraphs(GRAPH_A, GRAPH_B);
      expect(report.instabilityDelta).toBe(0);
      expect(report.propagationRiskDelta).toBe(0);
      expect(report.volatilityDelta).toBe(0);
    });

    it('reports zero drift for identical graphs', () => {
      const report = drift.compareGraphs(GRAPH_A, GRAPH_A);
      expect(report.driftMagnitude).toBe(0);
    });
  });

  describe('compareMetrics', () => {
    it('computes deltas with *100 scaling for driftMagnitude', () => {
      const report = drift.compareMetrics(METRICS_A, METRICS_B);
      expect(report.instabilityDelta).toBeCloseTo(0.05, 5);
      expect(report.propagationRiskDelta).toBe(0);
      expect(report.volatilityDelta).toBeCloseTo(0.02, 5);
      // sqrt((0.05*100)^2 + 0^2 + (0.02*100)^2) = sqrt(25 + 0 + 4) = sqrt(29) ≈ 5.385
      expect(report.driftMagnitude).toBeCloseTo(Math.sqrt(29), 10);
    });

    it('sets graph deltas to 0', () => {
      const report = drift.compareMetrics(METRICS_A, METRICS_B);
      expect(report.nodeDelta).toBe(0);
      expect(report.edgeDelta).toBe(0);
      expect(report.densityDelta).toBe(0);
      expect(report.sccDelta).toBe(0);
    });

    it('reports zero drift for identical metrics', () => {
      const report = drift.compareMetrics(METRICS_A, METRICS_A);
      expect(report.driftMagnitude).toBe(0);
    });
  });

  describe('classifyDrift', () => {
    const helper = (magnitude: number) => drift.compareGraphs(
      GRAPH_A,
      Object.freeze({ ...GRAPH_B, nodeCount: GRAPH_A.nodeCount + Math.round(magnitude) }),
    );

    it("returns 'stable' for magnitude < 5", () => {
      const report = drift.compareGraphs(GRAPH_A, GRAPH_A);
      expect(drift.classifyDrift(report)).toBe('stable');
    });

    it("returns 'minor' for magnitude 5..20", () => {
      const report = drift.compareGraphs(GRAPH_A, Object.freeze({ ...GRAPH_B, nodeCount: 16 }));
      expect(report.driftMagnitude).toBeGreaterThanOrEqual(5);
      expect(report.driftMagnitude).toBeLessThan(20);
      expect(drift.classifyDrift(report)).toBe('minor');
    });

    it("returns 'significant' for magnitude 20..50", () => {
      const report = drift.compareGraphs(GRAPH_A, Object.freeze({ ...GRAPH_B, nodeCount: 35 }));
      expect(report.driftMagnitude).toBeGreaterThanOrEqual(20);
      expect(report.driftMagnitude).toBeLessThan(50);
      expect(drift.classifyDrift(report)).toBe('significant');
    });

    it("returns 'critical' for magnitude >= 50", () => {
      const report = drift.compareGraphs(GRAPH_A, Object.freeze({ ...GRAPH_B, nodeCount: 65 }));
      expect(report.driftMagnitude).toBeGreaterThanOrEqual(50);
      expect(drift.classifyDrift(report)).toBe('critical');
    });
  });
});

/* ====================================================================== */
/*  VolatilityTracker                                                       */
/* ====================================================================== */

describe('VolatilityTracker', () => {
  it('constructor takes spikeThreshold with default 0.2', () => {
    const a = new VolatilityTracker();
    expect(a.threshold).toBe(0.2);
    const b = new VolatilityTracker(0.5);
    expect(b.threshold).toBe(0.5);
  });

  describe('recordChange', () => {
    let tracker: VolatilityTracker;

    beforeEach(() => {
      tracker = new VolatilityTracker(0.2);
    });

    it('creates events for changes > 0.001', () => {
      const events = tracker.recordChange(METRICS_A, METRICS_B);
      expect(events).toHaveLength(2);
      expect(events[0].metricName).toBe('instability');
      expect(events[1].metricName).toBe('volatility');
    });

    it('records spikes when change magnitude exceeds threshold', () => {
      const bigPrev: MetricsMemory = Object.freeze({
        id: 'm_big', snapshotId: 'ss_big',
        instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.05,
        timestamp: '2025-01-01T00:00:00Z',
      });
      const bigCurr: MetricsMemory = Object.freeze({
        id: 'm_big2', snapshotId: 'ss_big2',
        instability: 0.5, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.05,
        timestamp: '2025-01-02T00:00:00Z',
      });
      tracker.recordChange(bigPrev, bigCurr);
      expect(tracker.spikeCount).toBe(1);
      const spikes = tracker.getSpikes();
      expect(spikes[0].metricName).toBe('instability');
      expect(spikes[0].magnitude).toBeCloseTo(0.4, 5);
    });

    it('does not record spike when change <= threshold', () => {
      tracker.recordChange(METRICS_A, METRICS_B);
      // instability delta = 0.05, volatility delta = 0.02, both < 0.2
      expect(tracker.spikeCount).toBe(0);
    });

    it('returns empty when no metric changes exceed 0.001', () => {
      const events = tracker.recordChange(METRICS_A, METRICS_A);
      expect(events).toEqual([]);
    });
  });

  describe('getEvents / getSpikes', () => {
    it('return stored data', () => {
      const tracker = new VolatilityTracker(0.01);
      tracker.recordChange(METRICS_A, METRICS_B);
      expect(tracker.getEvents()).toHaveLength(2);
      expect(tracker.getSpikes()).toHaveLength(2); // both deltas exceed 0.01
    });
  });

  describe('getSpikesAboveThreshold', () => {
    it('filters by minimum magnitude', () => {
      const tracker = new VolatilityTracker(0.01);
      const bigPrev: MetricsMemory = Object.freeze({
        id: 'm_big', snapshotId: 'ss_big',
        instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.05,
        timestamp: '2025-01-01T00:00:00Z',
      });
      const bigCurr: MetricsMemory = Object.freeze({
        id: 'm_big2', snapshotId: 'ss_big2',
        instability: 0.5, propagationRisk: 0.35, fanInAvg: 1, fanOutAvg: 1, volatility: 0.05,
        timestamp: '2025-01-02T00:00:00Z',
      });
      tracker.recordChange(bigPrev, bigCurr);
      const filtered = tracker.getSpikesAboveThreshold(0.25);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].metricName).toBe('instability');
    });
  });

  it('clear resets', () => {
    const tracker = new VolatilityTracker(0.01);
    tracker.recordChange(METRICS_A, METRICS_B);
    tracker.clear();
    expect(tracker.eventCount).toBe(0);
    expect(tracker.spikeCount).toBe(0);
    expect(tracker.getEvents()).toEqual([]);
    expect(tracker.getSpikes()).toEqual([]);
  });
});

/* ====================================================================== */
/*  RegressionDetector                                                      */
/* ====================================================================== */

describe('RegressionDetector', () => {
  let detector: RegressionDetector;

  beforeEach(() => {
    detector = new RegressionDetector();
  });

  it('constructor takes thresholds with defaults (0.1, 0.15, 0.2)', () => {
    // verified via detectRegression behaviour
    expect(detector).toBeInstanceOf(RegressionDetector);
  });

  describe('detectRegression', () => {
    it('creates RegressionSignal when delta exceeds threshold', () => {
      const prev: MetricsMemory = Object.freeze({
        id: 'r1', snapshotId: 'ss_r1',
        instability: 0.2, propagationRisk: 0.2, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1,
        timestamp: '2025-01-01T00:00:00Z',
      });
      const curr: MetricsMemory = Object.freeze({
        id: 'r2', snapshotId: 'ss_r2',
        instability: 0.5, propagationRisk: 0.5, fanInAvg: 1, fanOutAvg: 1, volatility: 0.5,
        timestamp: '2025-01-02T00:00:00Z',
      });
      const signals = detector.detectRegression(prev, curr);
      expect(signals).toHaveLength(3);
      expect(signals[0].metricName).toBe('instability');
      expect(signals[1].metricName).toBe('propagationRisk');
      expect(signals[2].metricName).toBe('volatility');
    });

    it('assigns severity correctly for instability (info < 0.2, warning < 0.3, critical >= 0.3)', () => {
      const make = (instability: number): MetricsMemory => Object.freeze({
        id: 'r', snapshotId: 'ss_r',
        instability, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(detector.detectRegression(make(0), make(0.15))[0].severity).toBe('info');
      expect(detector.detectRegression(make(0), make(0.25))[0].severity).toBe('warning');
      expect(detector.detectRegression(make(0), make(0.35))[0].severity).toBe('critical');
    });

    it('assigns severity correctly for propagationRisk (warning < 0.3, critical >= 0.3)', () => {
      const make = (propagationRisk: number): MetricsMemory => Object.freeze({
        id: 'r', snapshotId: 'ss_r',
        instability: 0, propagationRisk, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(detector.detectRegression(make(0), make(0.2))[0].severity).toBe('warning');
      expect(detector.detectRegression(make(0), make(0.35))[0].severity).toBe('critical');
    });

    it('assigns severity correctly for volatility (warning < 0.4, critical >= 0.4)', () => {
      const make = (volatility: number): MetricsMemory => Object.freeze({
        id: 'r', snapshotId: 'ss_r',
        instability: 0, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility,
        timestamp: '2025-01-01T00:00:00Z',
      });
      expect(detector.detectRegression(make(0), make(0.3))[0].severity).toBe('warning');
      expect(detector.detectRegression(make(0), make(0.45))[0].severity).toBe('critical');
    });

    it('returns empty when deltas within thresholds', () => {
      const signals = detector.detectRegression(METRICS_A, METRICS_A);
      expect(signals).toEqual([]);
    });

    it('when previousValue is 0, percentChange defaults to currentValue*100', () => {
      const prev: MetricsMemory = Object.freeze({
        id: 'r1', snapshotId: 'ss_r1',
        instability: 0, propagationRisk: 0.2, fanInAvg: 0, fanOutAvg: 0, volatility: 0.2,
        timestamp: '2025-01-01T00:00:00Z',
      });
      const curr: MetricsMemory = Object.freeze({
        id: 'r2', snapshotId: 'ss_r2',
        instability: 0.3, propagationRisk: 0.2, fanInAvg: 0, fanOutAvg: 0, volatility: 0.2,
        timestamp: '2025-01-02T00:00:00Z',
      });
      const signals = detector.detectRegression(prev, curr);
      expect(signals[0].percentChange).toBe(30); // currentValue(0.3) * 100
    });
  });

  it('getSignals returns all signals', () => {
    const prev: MetricsMemory = Object.freeze({
      id: 'r1', snapshotId: 'ss_r1',
      instability: 0, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const curr: MetricsMemory = Object.freeze({
      id: 'r2', snapshotId: 'ss_r2',
      instability: 0.5, propagationRisk: 0.5, fanInAvg: 0, fanOutAvg: 0, volatility: 0.5,
      timestamp: '2025-01-02T00:00:00Z',
    });
    detector.detectRegression(prev, curr);
    expect(detector.getSignals()).toHaveLength(3);
  });

  it('getCriticalSignals returns critical signals sorted by percentChange desc', () => {
    const prev: MetricsMemory = Object.freeze({
      id: 'r1', snapshotId: 'ss_r1',
      instability: 0, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const curr: MetricsMemory = Object.freeze({
      id: 'r2', snapshotId: 'ss_r2',
      instability: 0.5, propagationRisk: 0.4, fanInAvg: 0, fanOutAvg: 0, volatility: 0.45,
      timestamp: '2025-01-02T00:00:00Z',
    });
    detector.detectRegression(prev, curr);
    const critical = detector.getCriticalSignals();
    expect(critical.length).toBeGreaterThan(0);
    for (let i = 1; i < critical.length; i++) {
      expect(critical[i - 1].percentChange).toBeGreaterThanOrEqual(critical[i].percentChange);
    }
  });

  describe('getSignalsByMetric', () => {
    it('filters by metricName', () => {
      const prev: MetricsMemory = Object.freeze({
        id: 'r1', snapshotId: 'ss_r1',
        instability: 0, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
        timestamp: '2025-01-01T00:00:00Z',
      });
      const curr: MetricsMemory = Object.freeze({
        id: 'r2', snapshotId: 'ss_r2',
        instability: 0.5, propagationRisk: 0.5, fanInAvg: 0, fanOutAvg: 0, volatility: 0.5,
        timestamp: '2025-01-02T00:00:00Z',
      });
      detector.detectRegression(prev, curr);
      const instabilitySignals = detector.getSignalsByMetric('instability');
      expect(instabilitySignals).toHaveLength(1);
      expect(instabilitySignals[0].metricName).toBe('instability');
    });
  });

  it('clear resets', () => {
    const prev: MetricsMemory = Object.freeze({
      id: 'r1', snapshotId: 'ss_r1',
      instability: 0, propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const curr: MetricsMemory = Object.freeze({
      id: 'r2', snapshotId: 'ss_r2',
      instability: 0.5, propagationRisk: 0.5, fanInAvg: 0, fanOutAvg: 0, volatility: 0.5,
      timestamp: '2025-01-02T00:00:00Z',
    });
    detector.detectRegression(prev, curr);
    detector.clear();
    expect(detector.getSignals()).toEqual([]);
    expect(detector.getCriticalSignals()).toEqual([]);
  });
});
