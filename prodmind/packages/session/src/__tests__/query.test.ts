import { describe, it, expect } from 'vitest';
import { SessionQueryEngine } from '../query/session-query-engine.ts';
import { TimelineQueryEngine } from '../query/timeline-query.ts';
import { SnapshotQueryEngine } from '../query/snapshot-query.ts';
import { InvestigationQueryEngine } from '../query/investigation-query.ts';
import { SessionSearchEngine } from '../query/search.ts';
import { SessionValidationError } from '../errors/index.ts';
import { TimelineError } from '../errors/index.ts';
import { SnapshotError } from '../errors/index.ts';
import { SessionError } from '../errors/index.ts';

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess-1',
    projectId: 'proj-1',
    status: 'ACTIVE',
    priority: 'HIGH',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    investigationGoal: 'test goal',
    tags: ['bug', 'critical'],
    eventCount: 5,
    snapshotCount: 2,
    interactionCount: 3,
    ...overrides,
  };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    sessionId: 'sess-1',
    eventType: 'SESSION_CREATED',
    timestamp: '2024-01-01T00:00:00Z',
    sequenceNumber: 1,
    correlationId: 'corr-1',
    causationId: 'caus-1',
    payloadJson: '{}',
    metadataJson: '{}',
    ...overrides,
  };
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'snap-1',
    sessionId: 'sess-1',
    version: 1,
    snapshotType: 'FULL',
    stateHash: 'hash123',
    fingerprintHash: 'fp123',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('SessionQueryEngine', () => {
  it('should find sessions by project', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.findSessionsByProject('proj-1');
    expect(result.items).toHaveLength(1);
  });

  it('should throw on empty project ID', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.findSessionsByProject('')).toThrow(SessionValidationError);
  });

  it('should find sessions by status', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.findSessionsByStatus('ACTIVE');
    expect(result.items).toHaveLength(1);
  });

  it('should throw on empty status', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.findSessionsByStatus('' as never)).toThrow(SessionValidationError);
  });

  it('should find sessions by priority', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.findSessionsByPriority('HIGH');
    expect(result.items).toHaveLength(1);
  });

  it('should find sessions by date range', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.findSessionsByDateRange('2023-01-01', '2025-01-01');
    expect(result.items).toHaveLength(1);
  });

  it('should throw on invalid date range', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.findSessionsByDateRange('invalid', '2025-01-01')).toThrow(SessionValidationError);
  });

  it('should throw on from after to', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.findSessionsByDateRange('2025-01-01', '2023-01-01')).toThrow(SessionValidationError);
  });

  it('should find sessions by tags', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.findSessionsByTags(['bug']);
    expect(result.items).toHaveLength(1);
  });

  it('should throw on empty tags', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.findSessionsByTags([])).toThrow(SessionValidationError);
  });

  it('should search sessions', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.searchSessions('test');
    expect(result.items).toHaveLength(1);
  });

  it('should return empty for no match', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const result = engine.searchSessions('nonexistent');
    expect(result.items).toHaveLength(0);
  });

  it('should throw on empty query', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.searchSessions('')).toThrow(SessionValidationError);
  });

  it('should get session stats', () => {
    const engine = new SessionQueryEngine([makeSession()]);
    const stats = engine.getSessionStats('proj-1');
    expect(stats.totalSessions).toBe(1);
    expect(stats.statusDistribution['ACTIVE']).toBe(1);
  });

  it('should throw on empty project ID for stats', () => {
    const engine = new SessionQueryEngine();
    expect(() => engine.getSessionStats('')).toThrow(SessionValidationError);
  });

  it('should paginate results', () => {
    const sessions = Array.from({ length: 25 }, (_, i) => makeSession({ id: `sess-${i}` }));
    const engine = new SessionQueryEngine(sessions);
    const page1 = engine.findSessionsByProject('proj-1', undefined, 1, 10);
    expect(page1.items).toHaveLength(10);
    expect(page1.totalPages).toBe(3);
  });
});

describe('TimelineQueryEngine', () => {
  it('should find events by session', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const result = engine.findEventsBySession('sess-1');
    expect(result.items).toHaveLength(1);
  });

  it('should find events by type', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const result = engine.findEventsByType('sess-1', 'SESSION_CREATED');
    expect(result.items).toHaveLength(1);
  });

  it('should find events by date range', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const result = engine.findEventsByDateRange('sess-1', '2023-01-01', '2025-01-01');
    expect(result.items).toHaveLength(1);
  });

  it('should find events by correlation ID', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const result = engine.findEventsByCorrelationId('corr-1');
    expect(result.items).toHaveLength(1);
  });

  it('should find events by causation ID', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const result = engine.findEventsByCausationId('caus-1');
    expect(result.items).toHaveLength(1);
  });

  it('should get event type distribution', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const dist = engine.getEventTypeDistribution('sess-1');
    expect(dist).toHaveLength(1);
    expect(dist[0]?.percentage).toBe(100);
  });

  it('should get timeline heatmap', () => {
    const engine = new TimelineQueryEngine([makeEvent()]);
    const heatmap = engine.getTimelineHeatmap('sess-1');
    expect(heatmap).toHaveLength(1);
  });

  it('should throw on empty session for findEventsBySession', () => {
    const engine = new TimelineQueryEngine();
    expect(() => engine.findEventsBySession('')).toThrow(TimelineError);
  });

  it('should throw on empty correlation ID', () => {
    const engine = new TimelineQueryEngine();
    expect(() => engine.findEventsByCorrelationId('')).toThrow(TimelineError);
  });
});

describe('SnapshotQueryEngine', () => {
  it('should find snapshots by session', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const result = engine.findSnapshotsBySession('sess-1');
    expect(result.items).toHaveLength(1);
  });

  it('should find snapshots by type', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const result = engine.findSnapshotsByType('sess-1', 'FULL');
    expect(result.items).toHaveLength(1);
  });

  it('should find snapshots by state hash', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const result = engine.findSnapshotsByStateHash('hash123');
    expect(result.items).toHaveLength(1);
  });

  it('should find snapshots by fingerprint', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const result = engine.findSnapshotsByFingerprint('fp123');
    expect(result.items).toHaveLength(1);
  });

  it('should find snapshots by date range', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const result = engine.findSnapshotsByDateRange('sess-1', '2023-01-01', '2025-01-01');
    expect(result.items).toHaveLength(1);
  });

  it('should get snapshot version history', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot(), makeSnapshot({ version: 2, id: 'snap-2' })]);
    const history = engine.getSnapshotVersionHistory('sess-1');
    expect(history).toHaveLength(2);
  });

  it('should get snapshot stats', () => {
    const engine = new SnapshotQueryEngine([makeSnapshot()]);
    const stats = engine.getSnapshotStats('sess-1');
    expect(stats.totalSnapshots).toBe(1);
    expect(stats.latestVersion).toBe(1);
  });

  it('should throw on empty session ID', () => {
    const engine = new SnapshotQueryEngine();
    expect(() => engine.findSnapshotsBySession('')).toThrow(SnapshotError);
  });
});

describe('InvestigationQueryEngine', () => {
  const insight = {
    id: 'ins-1',
    sessionId: 'sess-1',
    category: 'bug',
    confidence: 0.85,
    createdAt: '2024-01-01T00:00:00Z',
    summary: 'test insight',
  };

  it('should find insights by session', () => {
    const engine = new InvestigationQueryEngine([insight], [], []);
    const result = engine.findInsightsBySession('sess-1');
    expect(result.items).toHaveLength(1);
  });

  it('should find insights by category', () => {
    const engine = new InvestigationQueryEngine([insight], [], []);
    const result = engine.findInsightsByCategory('sess-1', 'bug');
    expect(result.items).toHaveLength(1);
  });

  it('should find insights by confidence', () => {
    const engine = new InvestigationQueryEngine([insight], [], []);
    const result = engine.findInsightsByConfidence('sess-1', 0.8);
    expect(result.items).toHaveLength(1);
  });

  it('should throw on empty session', () => {
    const engine = new InvestigationQueryEngine();
    expect(() => engine.findInsightsBySession('')).toThrow(SessionError);
  });

  it('should get hypothesis history', () => {
    const hypothesis = { id: 'hyp-sess-1-1', hypothesis: 'test', status: 'PROPOSED', confidence: 0.5, createdAt: '2024-01-01T00:00:00Z', evidence: [] };
    const engine = new InvestigationQueryEngine([], [hypothesis], []);
    const history = engine.getHypothesisHistory('sess-1');
    expect(history).toHaveLength(1);
  });

  it('should get investigation timeline', () => {
    const engine = new InvestigationQueryEngine([], [], [makeEvent({ eventType: 'HYPOTHESIS_FORMED' })]);
    const timeline = engine.getInvestigationTimeline('sess-1');
    expect(timeline).toHaveLength(1);
  });

  it('should get investigation summary', () => {
    const engine = new InvestigationQueryEngine([insight], [], []);
    const summary = engine.getInvestigationSummary('sess-1');
    expect(summary.totalInsights).toBe(1);
    expect(summary.totalHypotheses).toBe(0);
  });
});

describe('SessionSearchEngine', () => {
  it('should search all types', () => {
    const engine = new SessionSearchEngine([makeSession()], [], [], []);
    const results = engine.searchAll('test');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should search sessions', () => {
    const engine = new SessionSearchEngine([makeSession()], [], [], []);
    const results = engine.searchSessions('sess-1');
    expect(results).toHaveLength(1);
  });

  it('should search timeline events', () => {
    const engine = new SessionSearchEngine([], [makeEvent({ payloadJson: JSON.stringify({ key: 'value' }) })], [], []);
    const results = engine.searchTimelineEvents('value');
    expect(results).toHaveLength(1);
  });

  it('should search interactions', () => {
    const engine = new SessionSearchEngine([], [], [{ id: 'int-1', sessionId: 'sess-1', content: 'test interaction', createdAt: '2024-01-01T00:00:00Z' }], []);
    const results = engine.searchInteractions('test');
    expect(results).toHaveLength(1);
  });

  it('should search snapshots', () => {
    const engine = new SessionSearchEngine([], [], [], [makeSnapshot()]);
    const results = engine.searchSnapshots('hash123');
    expect(results).toHaveLength(1);
  });

  it('should throw on empty search query', () => {
    const engine = new SessionSearchEngine();
    expect(() => engine.searchAll('')).toThrow(SessionError);
  });

  it('should return empty for empty query on individual search', () => {
    const engine = new SessionSearchEngine([makeSession()], [], [], []);
    expect(engine.searchSessions('')).toEqual([]);
  });
});
