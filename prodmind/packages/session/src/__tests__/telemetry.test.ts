import { describe, it, expect } from 'vitest';
import { SessionTelemetry } from '../telemetry/session-telemetry.ts';
import { InvestigationMetrics } from '../telemetry/investigation-metrics.ts';
import { ReplayMetrics } from '../telemetry/replay-metrics.ts';
import { RestorationMetrics } from '../telemetry/restoration-metrics.ts';
import { SessionError } from '../errors/index.ts';

describe('SessionTelemetry', () => {
  it('should record session created', () => {
    const tel = new SessionTelemetry();
    const event = tel.recordSessionCreated({ id: 'sess-1', projectId: 'proj-1', status: 'ACTIVE', priority: 'HIGH', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', tags: [], eventCount: 0, snapshotCount: 0, interactionCount: 0, investigationGoal: 'test' });
    expect(event.type).toBe('SESSION_CREATED');
    expect(event.sessionId).toBe('sess-1');
  });

  it('should record session event', () => {
    const tel = new SessionTelemetry();
    const event = tel.recordSessionEvent('sess-1', 'SESSION_CREATED');
    expect(event.type).toBe('SESSION_CREATED');
  });

  it('should throw on record session event without session ID', () => {
    const tel = new SessionTelemetry();
    expect(() => tel.recordSessionEvent('', 'SESSION_CREATED')).toThrow(SessionError);
  });

  it('should record metric', () => {
    const tel = new SessionTelemetry();
    const metric = tel.recordMetric('sess-1', 'cpu_usage', 50);
    expect(metric.name).toBe('cpu_usage');
    expect(metric.value).toBe(50);
  });

  it('should throw on record metric without session ID', () => {
    const tel = new SessionTelemetry();
    expect(() => tel.recordMetric('', 'cpu_usage', 50)).toThrow(SessionError);
  });

  it('should throw on NaN metric value', () => {
    const tel = new SessionTelemetry();
    expect(() => tel.recordMetric('sess-1', 'cpu_usage', NaN)).toThrow(SessionError);
  });

  it('should get session metrics', () => {
    const tel = new SessionTelemetry();
    tel.recordMetric('sess-1', 'cpu', 50);
    const metrics = tel.getSessionMetrics('sess-1');
    expect(metrics).toHaveLength(1);
  });

  it('should return empty metrics for unknown session', () => {
    const tel = new SessionTelemetry();
    expect(tel.getSessionMetrics('unknown')).toEqual([]);
  });

  it('should get telemetry summary', () => {
    const tel = new SessionTelemetry();
    tel.recordSessionCreated({ id: 'sess-1', projectId: 'proj-1', status: 'ACTIVE', priority: 'HIGH', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', tags: [], eventCount: 0, snapshotCount: 0, interactionCount: 0, investigationGoal: 'test' });
    const summary = tel.getTelemetrySummary('sess-1');
    expect(summary.totalEvents).toBe(1);
  });

  it('should return empty summary for unknown session', () => {
    const tel = new SessionTelemetry();
    const summary = tel.getTelemetrySummary('unknown');
    expect(summary.totalEvents).toBe(0);
  });

  it('should clear session', () => {
    const tel = new SessionTelemetry();
    tel.recordSessionEvent('sess-1', 'SESSION_CREATED');
    tel.clearSession('sess-1');
    expect(tel.getSessionMetrics('sess-1')).toEqual([]);
  });

  it('should clear all', () => {
    const tel = new SessionTelemetry();
    tel.recordSessionEvent('sess-1', 'SESSION_CREATED');
    tel.clearAll();
    expect(tel.getTelemetrySummary('sess-1').totalEvents).toBe(0);
  });
});

describe('InvestigationMetrics', () => {
  it('should record hypothesis formation', () => {
    const im = new InvestigationMetrics();
    im.recordHypothesisFormation('sess-1');
    const stats = im.getInvestigationStats('sess-1');
    expect(stats.totalHypothesesFormed).toBe(1);
  });

  it('should throw on record hypothesis formation without session ID', () => {
    const im = new InvestigationMetrics();
    expect(() => im.recordHypothesisFormation('')).toThrow(SessionError);
  });

  it('should record insight discovery', () => {
    const im = new InvestigationMetrics();
    im.recordInsightDiscovery('sess-1', { id: 'ins-1', sessionId: 'sess-1', category: 'bug', confidence: 0.85, createdAt: '2024-01-01T00:00:00Z', summary: 'test' });
    const stats = im.getInvestigationStats('sess-1');
    expect(stats.totalInsightsDiscovered).toBe(1);
  });

  it('should throw on record insight without session ID', () => {
    const im = new InvestigationMetrics();
    expect(() => im.recordInsightDiscovery('', {} as never)).toThrow(SessionError);
  });

  it('should record snapshot capture', () => {
    const im = new InvestigationMetrics();
    im.recordSnapshotCapture('sess-1', { id: 'snap-1', version: 1 });
    const stats = im.getInvestigationStats('sess-1');
    expect(stats.totalSnapshotsCaptured).toBe(1);
  });

  it('should throw on record snapshot capture without session ID', () => {
    const im = new InvestigationMetrics();
    expect(() => im.recordSnapshotCapture('', { id: 'snap-1', version: 1 })).toThrow(SessionError);
  });

  it('should get hypothesis metrics', () => {
    const im = new InvestigationMetrics();
    const metrics = im.getHypothesisMetrics('sess-1');
    expect(metrics.totalFormed).toBe(0);
  });

  it('should clear session', () => {
    const im = new InvestigationMetrics();
    im.recordHypothesisFormation('sess-1');
    im.clearSession('sess-1');
    expect(im.getInvestigationStats('sess-1').totalHypothesesFormed).toBe(0);
  });
});

describe('ReplayMetrics', () => {
  it('should record replay start', () => {
    const rm = new ReplayMetrics();
    const record = rm.recordReplayStart('r-1', 'sess-1');
    expect(record.status).toBe('STARTED');
  });

  it('should throw on record replay start without ID', () => {
    const rm = new ReplayMetrics();
    expect(() => rm.recordReplayStart('', 'sess-1')).toThrow(SessionError);
  });

  it('should record replay completion', () => {
    const rm = new ReplayMetrics();
    rm.recordReplayStart('r-1', 'sess-1');
    const record = rm.recordReplayCompletion('r-1', 100);
    expect(record?.status).toBe('COMPLETED');
    expect(record?.duration).toBe(100);
  });

  it('should return null for unknown replay completion', () => {
    const rm = new ReplayMetrics();
    expect(rm.recordReplayCompletion('unknown', 100)).toBeNull();
  });

  it('should record replay failure', () => {
    const rm = new ReplayMetrics();
    rm.recordReplayStart('r-1', 'sess-1');
    const record = rm.recordReplayFailure('r-1', 'error');
    expect(record?.status).toBe('FAILED');
  });

  it('should get replay stats', () => {
    const rm = new ReplayMetrics();
    rm.recordReplayStart('r-1', 'sess-1');
    rm.recordReplayCompletion('r-1', 100);
    const stats = rm.getReplayStats('sess-1');
    expect(stats.totalReplays).toBe(1);
    expect(stats.completedReplays).toBe(1);
  });

  it('should get replay success rate', () => {
    const rm = new ReplayMetrics();
    rm.recordReplayStart('r-1', 'sess-1');
    rm.recordReplayCompletion('r-1', 100);
    expect(rm.getReplaySuccessRate('sess-1')).toBe(1);
  });

  it('should return 0 success rate for no replays', () => {
    const rm = new ReplayMetrics();
    expect(rm.getReplaySuccessRate('sess-1')).toBe(0);
  });

  it('should clear session', () => {
    const rm = new ReplayMetrics();
    rm.recordReplayStart('r-1', 'sess-1');
    rm.clearSession('sess-1');
    expect(rm.getReplayStats('sess-1').totalReplays).toBe(0);
  });
});

describe('RestorationMetrics', () => {
  it('should record restoration start', () => {
    const rm = new RestorationMetrics();
    const record = rm.recordRestorationStart('sess-1');
    expect(record.status).toBe('STARTED');
  });

  it('should throw on record restoration start without session ID', () => {
    const rm = new RestorationMetrics();
    expect(() => rm.recordRestorationStart('')).toThrow(SessionError);
  });

  it('should record restoration complete', () => {
    const rm = new RestorationMetrics();
    rm.recordRestorationStart('sess-1');
    const record = rm.recordRestorationComplete('sess-1', 100, 5);
    expect(record?.status).toBe('COMPLETED');
  });

  it('should return null for unknown restoration complete', () => {
    const rm = new RestorationMetrics();
    expect(rm.recordRestorationComplete('unknown', 100, 5)).toBeNull();
  });

  it('should record restoration failure', () => {
    const rm = new RestorationMetrics();
    rm.recordRestorationStart('sess-1');
    const record = rm.recordRestorationFailure('sess-1', 'error');
    expect(record?.status).toBe('FAILED');
  });

  it('should get restoration stats', () => {
    const rm = new RestorationMetrics();
    rm.recordRestorationStart('sess-1');
    rm.recordRestorationComplete('sess-1', 100, 5);
    const stats = rm.getRestorationStats('sess-1');
    expect(stats.totalRestorations).toBe(1);
    expect(stats.completedRestorations).toBe(1);
  });

  it('should get restoration success rate', () => {
    const rm = new RestorationMetrics();
    rm.recordRestorationStart('sess-1');
    rm.recordRestorationComplete('sess-1', 100, 5);
    expect(rm.getRestorationSuccessRate('sess-1')).toBe(1);
  });

  it('should return 0 success rate for no restorations', () => {
    const rm = new RestorationMetrics();
    expect(rm.getRestorationSuccessRate('sess-1')).toBe(0);
  });

  it('should clear session', () => {
    const rm = new RestorationMetrics();
    rm.recordRestorationStart('sess-1');
    rm.clearSession('sess-1');
    expect(rm.getRestorationStats('sess-1').totalRestorations).toBe(0);
  });
});
