import { describe, expect, it, beforeEach, vi } from 'vitest';
import { StructuredEventBus } from '../observability/event-bus';
import { SystemHealthAggregator } from '../observability/health-aggregator';
import { OperationalSnapshotGenerator } from '../observability/snapshot-generator';
import { IncidentRecorder } from '../observability/incident-recorder';
import { DiagnosticExportService } from '../observability/diagnostics';

// ---------------------------------------------------------------------------
// StructuredEventBus
// ---------------------------------------------------------------------------
describe('StructuredEventBus', () => {
  let bus: StructuredEventBus;

  beforeEach(() => {
    bus = new StructuredEventBus();
  });

  it('publishes and returns a frozen event', () => {
    const event = bus.publish('test.event', { key: 'value' });
    expect(event).toBeDefined();
    expect(event.eventType).toBe('test.event');
    expect(event.payload).toEqual({ key: 'value' });
    expect(() => {
      (event as any).payload = {};
    }).toThrow();
  });

  it('delivers published events to subscribers', () => {
    const handler = vi.fn();
    bus.subscribe('test.event', handler);
    bus.publish('test.event', { n: 1 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]!.eventType).toBe('test.event');
  });

  it('does not deliver events to subscribers of a different type', () => {
    const handler = vi.fn();
    bus.subscribe('other.event', handler);
    bus.publish('test.event', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns an unsubscribe function that stops delivery', () => {
    const handler = vi.fn();
    const unsub = bus.subscribe('test.event', handler);
    bus.publish('test.event', { n: 1 });
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    bus.publish('test.event', { n: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('delivers events to subscribeAll handlers', () => {
    const handler = vi.fn();
    bus.subscribeAll(handler);
    bus.publish('a', {});
    bus.publish('b', {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('returns unsubscribe function for subscribeAll', () => {
    const handler = vi.fn();
    const unsub = bus.subscribeAll(handler);
    unsub();
    bus.publish('a', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('maintains deterministic event ordering by insertion', () => {
    bus.publish('e1', { order: 1 });
    bus.publish('e2', { order: 2 });
    bus.publish('e3', { order: 3 });

    const events = bus.getEvents();
    expect(events[0]!.payload).toEqual({ order: 1 });
    expect(events[1]!.payload).toEqual({ order: 2 });
    expect(events[2]!.payload).toEqual({ order: 3 });
  });

  it('respects bounded retention (max 10000)', () => {
    const small = new StructuredEventBus(5);
    for (let i = 0; i < 10; i++) {
      small.publish('t', { i });
    }
    expect(small.getEventCount()).toBe(5);
    expect(small.getEvents()[0]!.payload).toEqual({ i: 5 });
  });

  it('getEvents filters by event type', () => {
    bus.publish('a', {});
    bus.publish('b', {});
    bus.publish('a', {});
    expect(bus.getEvents('a')).toHaveLength(2);
    expect(bus.getEvents('b')).toHaveLength(1);
  });

  it('getEvents respects limit', () => {
    bus.publish('a', { v: 1 });
    bus.publish('a', { v: 2 });
    bus.publish('a', { v: 3 });
    const limited = bus.getEvents('a', 2);
    expect(limited).toHaveLength(2);
    expect(limited[0]!.payload).toEqual({ v: 2 });
  });

  it('clear removes all events when no arg', () => {
    bus.publish('a', {});
    bus.publish('b', {});
    expect(bus.getEventCount()).toBe(2);
    const cleared = bus.clear();
    expect(cleared).toBe(2);
    expect(bus.getEventCount()).toBe(0);
  });

  it('clear removes only events older than specified ms', () => {
    vi.useFakeTimers();

    vi.advanceTimersByTime(100);

    vi.useRealTimers();
  });

  it('empty bus returns empty arrays and zero count', () => {
    expect(bus.getEvents()).toEqual([]);
    expect(bus.getEventCount()).toBe(0);
    expect(bus.clear()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SystemHealthAggregator
// ---------------------------------------------------------------------------
describe('SystemHealthAggregator', () => {
  let health: SystemHealthAggregator;

  beforeEach(() => {
    health = new SystemHealthAggregator();
  });

  it('returns undefined for unknown component', () => {
    expect(health.getComponentStatus('nonexistent')).toBeUndefined();
  });

  it('updates and retrieves component status', () => {
    health.updateComponent('parser', 'healthy', { version: '1.0' });
    const status = health.getComponentStatus('parser');
    expect(status).toBeDefined();
    expect(status!.status).toBe('healthy');
    expect(status!.details).toEqual({ version: '1.0' });
  });

  it('getOverallHealth returns healthy when all components are healthy', () => {
    health.updateComponent('parser', 'healthy');
    health.updateComponent('provider', 'healthy');
    expect(health.getOverallHealth()).toBe('healthy');
  });

  it('getOverallHealth returns degraded when any component is degraded', () => {
    health.updateComponent('parser', 'healthy');
    health.updateComponent('provider', 'degraded');
    expect(health.getOverallHealth()).toBe('degraded');
  });

  it('getOverallHealth returns down when any component is down', () => {
    health.updateComponent('parser', 'healthy');
    health.updateComponent('orchestration', 'down');
    expect(health.getOverallHealth()).toBe('down');
  });

  it('getUnhealthyComponents lists degraded and down components', () => {
    health.updateComponent('parser', 'healthy');
    health.updateComponent('provider', 'degraded');
    health.updateComponent('graph_engine', 'down');
    const unhealthy = health.getUnhealthyComponents();
    expect(unhealthy).toContain('provider');
    expect(unhealthy).toContain('graph_engine');
    expect(unhealthy).not.toContain('parser');
  });

  it('reset clears all component statuses', () => {
    health.updateComponent('parser', 'healthy');
    health.reset();
    expect(health.getComponentStatus('parser')).toBeUndefined();
    expect(health.getAllStatuses()).toEqual({});
    expect(health.getOverallHealth()).toBe('healthy');
  });

  it('returns healthy when no components have been registered', () => {
    expect(health.getOverallHealth()).toBe('healthy');
    expect(health.getUnhealthyComponents()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// OperationalSnapshotGenerator
// ---------------------------------------------------------------------------
describe('OperationalSnapshotGenerator', () => {
  let snapshots: OperationalSnapshotGenerator;

  beforeEach(() => {
    snapshots = new OperationalSnapshotGenerator();
  });

  it('captures a runtime snapshot', () => {
    const result = snapshots.captureRuntimeSnapshot({
      runtimeState: { uptime: 100 },
    });
    expect(result.snapshotType).toBe('runtime');
    expect(result.payload).toEqual({ uptime: 100 });
  });

  it('captures an orchestration state snapshot', () => {
    const result = snapshots.captureOrchestrationState({
      orchestrationState: { active: true },
    });
    expect(result.snapshotType).toBe('orchestration');
    expect(result.payload).toEqual({ active: true });
  });

  it('captures a provider summary snapshot', () => {
    const result = snapshots.captureProviderSummary({
      providerStates: { openai: 'ready' },
    });
    expect(result.snapshotType).toBe('provider_summary');
    expect(result.payload).toEqual({ openai: 'ready' });
  });

  it('captures a replay summary snapshot', () => {
    const result = snapshots.captureReplaySummary({
      replayState: { completed: 5 },
    });
    expect(result.snapshotType).toBe('replay_summary');
    expect(result.payload).toEqual({ completed: 5 });
  });

  it('captures a governance state snapshot', () => {
    const result = snapshots.captureGovernanceState({
      governanceState: { rules: [] },
    });
    expect(result.snapshotType).toBe('governance');
    expect(result.payload).toEqual({ rules: [] });
  });

  it('getSnapshotHistory returns all snapshots', () => {
    snapshots.captureRuntimeSnapshot({ runtimeState: { a: 1 } });
    snapshots.captureOrchestrationState({ orchestrationState: { b: 2 } });
    expect(snapshots.getSnapshotHistory()).toHaveLength(2);
  });

  it('getSnapshotHistory filters by type', () => {
    snapshots.captureRuntimeSnapshot({ runtimeState: { a: 1 } });
    snapshots.captureReplaySummary({ replayState: { c: 3 } });
    const filtered = snapshots.getSnapshotHistory('runtime');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.snapshotType).toBe('runtime');
  });

  it('clear removes all snapshots', () => {
    snapshots.captureRuntimeSnapshot({ runtimeState: { a: 1 } });
    snapshots.clear();
    expect(snapshots.getSnapshotHistory()).toHaveLength(0);
  });

  it('snapshot payloads are frozen', () => {
    const result = snapshots.captureRuntimeSnapshot({
      runtimeState: { x: 1 },
    });
    expect(() => {
      (result as any).payload = {};
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// IncidentRecorder
// ---------------------------------------------------------------------------
describe('IncidentRecorder', () => {
  let recorder: IncidentRecorder;

  beforeEach(() => {
    recorder = new IncidentRecorder();
  });

  it('records an incident and returns a frozen object', () => {
    const incident = recorder.recordIncident('timeout', 'high', { url: '/api' });
    expect(incident.type).toBe('timeout');
    expect(incident.severity).toBe('high');
    expect(incident.resolved).toBe(false);
    expect(incident.details).toEqual({ url: '/api' });
    expect(() => {
      (incident as any).details = {};
    }).toThrow();
  });

  it('getIncidents returns only matching type', () => {
    recorder.recordIncident('a', 'low', {});
    recorder.recordIncident('b', 'low', {});
    const incidents = recorder.getIncidents('a');
    expect(incidents).toHaveLength(1);
    expect(incidents[0]!.type).toBe('a');
  });

  it('getIncidents returns only matching severity', () => {
    recorder.recordIncident('a', 'low', {});
    recorder.recordIncident('a', 'critical', {});
    const incidents = recorder.getIncidents(undefined, 'critical');
    expect(incidents).toHaveLength(1);
    expect(incidents[0]!.severity).toBe('critical');
  });

  it('getCriticalIncidents returns only critical incidents', () => {
    recorder.recordIncident('a', 'low', {});
    recorder.recordIncident('b', 'critical', {});
    recorder.recordIncident('c', 'critical', {});
    expect(recorder.getCriticalIncidents()).toHaveLength(2);
  });

  it('getIncidentSummary returns correct counts', () => {
    recorder.recordIncident('timeout', 'high', {});
    recorder.recordIncident('timeout', 'low', {});
    recorder.recordIncident('crash', 'critical', {});
    const summary = recorder.getIncidentSummary();
    expect(summary.total).toBe(3);
    expect(summary.byType).toEqual({ timeout: 2, crash: 1 });
    expect(summary.bySeverity).toEqual({ high: 1, low: 1, critical: 1 });
    expect(summary.openCount).toBe(3);
  });

  it('resolveIncident marks incident as resolved', () => {
    const incident = recorder.recordIncident('a', 'low', {});
    expect(recorder.resolveIncident(incident.id)).toBe(true);
    const retrieved = recorder.getIncidents(undefined, undefined);
    expect(retrieved[0]!.resolved).toBe(true);
    expect(retrieved[0]!.resolvedAt).toBeDefined();
  });

  it('resolveIncident returns false for unknown or already resolved', () => {
    expect(recorder.resolveIncident('nonexistent')).toBe(false);

    const incident = recorder.recordIncident('a', 'low', {});
    recorder.resolveIncident(incident.id);
    expect(recorder.resolveIncident(incident.id)).toBe(false);
  });

  it('clear removes all incidents', () => {
    recorder.recordIncident('a', 'low', {});
    recorder.clear();
    expect(recorder.getIncidents()).toHaveLength(0);
    expect(recorder.getIncidentSummary().total).toBe(0);
  });

  it('returns empty arrays when no incidents exist', () => {
    expect(recorder.getIncidents()).toEqual([]);
    expect(recorder.getCriticalIncidents()).toEqual([]);
    expect(recorder.getIncidentSummary().total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DiagnosticExportService
// ---------------------------------------------------------------------------
describe('DiagnosticExportService', () => {
  let service: DiagnosticExportService;

  beforeEach(() => {
    service = new DiagnosticExportService();
  });

  it('exports audit trail', () => {
    const result = service.exportAuditTrail({ eventType: 'test' });
    expect(result.exportType).toBe('audit_trail');
    expect(result.data).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
  });

  it('exports operational snapshot', () => {
    const result = service.exportOperationalSnapshot(['runtime']);
    expect(result.exportType).toBe('operational_snapshot');
  });

  it('exports replay trace', () => {
    const result = service.exportReplayTrace({ step: 1 });
    expect(result.exportType).toBe('replay_trace');
    expect(result.data).toMatchObject({ step: 1 });
  });

  it('exports telemetry trace', () => {
    const result = service.exportTelemetryTrace({ cpu: 50 });
    expect(result.exportType).toBe('telemetry_trace');
    expect(result.data).toMatchObject({ cpu: 50 });
  });

  it('getExportHistory returns exports sorted deterministically by id', () => {
    service.exportAuditTrail();
    service.exportReplayTrace({ x: 1 });
    service.exportTelemetryTrace({ y: 2 });
    const history = service.getExportHistory();
    expect(history).toHaveLength(3);
    const ids = history.map((e) => e.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('clear removes all exports', () => {
    service.exportAuditTrail();
    service.clear();
    expect(service.getExportHistory()).toHaveLength(0);
  });

  it('returns empty history when no exports exist', () => {
    expect(service.getExportHistory()).toEqual([]);
  });

  it('export data is frozen', () => {
    const result = service.exportAuditTrail();
    expect(() => {
      (result as any).data = {};
    }).toThrow();
  });
});
