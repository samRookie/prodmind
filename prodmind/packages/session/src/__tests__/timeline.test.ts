import { describe, it, expect } from 'vitest';
import { InvestigationTimeline } from '../timeline/investigation-timeline.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';
import { EventStore } from '../timeline/event-store.ts';
import { EventOrdering } from '../timeline/ordering.ts';
import { queryEvents, getHypothesisEvents, getSnapshotEvents, getInteractionEvents, searchEvents } from '../timeline/query.ts';
import { compressTimeline, decompressTimeline, summarizeTimeline, getTimelineStats } from '../timeline/compression.ts';
import { TimelineError } from '../errors/index.ts';

describe('InvestigationTimeline', () => {
  it('should create timeline with session ID', () => {
    const tl = new InvestigationTimeline('sess-1');
    expect(tl.sessionId).toBe('sess-1');
    expect(tl.getEventCount()).toBe(0);
  });

  it('should add event and return it', () => {
    const tl = new InvestigationTimeline('sess-1');
    const event = tl.addEvent('HYPOTHESIS_FORMED', { statement: 'test' });
    expect(event.eventType).toBe('HYPOTHESIS_FORMED');
    expect(event.sequenceNumber).toBe(1);
    expect(event.sessionId).toBe('sess-1');
  });

  it('should throw on addEvent with empty type', () => {
    const tl = new InvestigationTimeline('sess-1');
    expect(() => tl.addEvent('' as never)).toThrow(TimelineError);
  });

  it('should increment sequence numbers', () => {
    const tl = new InvestigationTimeline('sess-1');
    tl.addEvent('SESSION_CREATED');
    tl.addEvent('SESSION_ACTIVATED');
    tl.addEvent('HYPOTHESIS_FORMED');
    expect(tl.getEvents()).toHaveLength(3);
    expect(tl.getEvents()[1]?.sequenceNumber).toBe(2);
  });

  it('should get events by type', () => {
    const tl = new InvestigationTimeline('sess-1');
    tl.addEvent('SESSION_CREATED');
    tl.addEvent('HYPOTHESIS_FORMED');
    tl.addEvent('SESSION_ACTIVATED');
    expect(tl.getEventsByType('HYPOTHESIS_FORMED')).toHaveLength(1);
  });

  it('should get events by date range', () => {
    const tl = new InvestigationTimeline('sess-1');
    tl.addEvent('SESSION_CREATED');
    const events = tl.getEvents();
    const from = events[0]!.timestamp;
    const to = from;
    expect(tl.getEventsByDateRange(from, to)).toHaveLength(1);
  });

  it('should get latest event', () => {
    const tl = new InvestigationTimeline('sess-1');
    expect(tl.getLatestEvent()).toBeUndefined();
    tl.addEvent('SESSION_CREATED');
    const last = tl.addEvent('SESSION_ACTIVATED');
    expect(tl.getLatestEvent()?.id).toBe(last.id);
  });

  it('should clear timeline', () => {
    const tl = new InvestigationTimeline('sess-1');
    tl.addEvent('SESSION_CREATED');
    tl.addEvent('SESSION_ACTIVATED');
    tl.clear();
    expect(tl.getEventCount()).toBe(0);
  });

  it('should serialize and deserialize via JSON', () => {
    const tl = new InvestigationTimeline('sess-1');
    tl.addEvent('SESSION_CREATED');
    tl.addEvent('HYPOTHESIS_FORMED');
    const json = tl.toJSON();
    const restored = InvestigationTimeline.fromJSON(json);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.getEventCount()).toBe(2);
    expect(restored.getEvents()[0]?.eventType).toBe('SESSION_CREATED');
  });
});

describe('EventStore', () => {
  it('should store and retrieve events', () => {
    const store = new EventStore();
    const event: TimelineEvent = { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() };
    store.store('sess-1', event);
    expect(store.getBySessionId('sess-1')).toHaveLength(1);
  });

  it('should store batch of events', () => {
    const store = new EventStore();
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_ACTIVATED', sequenceNumber: 2, timestamp: new Date().toISOString() },
    ];
    store.storeBatch('sess-1', events);
    expect(store.getBySessionId('sess-1')).toHaveLength(2);
  });

  it('should get events by type', () => {
    const store = new EventStore();
    const e1: TimelineEvent = { id: 'e1', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 1, timestamp: new Date().toISOString() };
    const e2: TimelineEvent = { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 2, timestamp: new Date().toISOString() };
    store.store('sess-1', e1);
    store.store('sess-1', e2);
    expect(store.getByEventType('sess-1', 'HYPOTHESIS_FORMED')).toHaveLength(1);
  });

  it('should get events by sequence range', () => {
    const store = new EventStore();
    for (let i = 1; i <= 5; i++) {
      store.store('sess-1', { id: `e${i}`, sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: i, timestamp: new Date().toISOString() });
    }
    expect(store.getBySequenceRange('sess-1', 2, 4)).toHaveLength(3);
  });

  it('should get latest sequence number', () => {
    const store = new EventStore();
    expect(store.getLatestSequenceNumber('sess-1')).toBe(0);
    store.store('sess-1', { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 5, timestamp: new Date().toISOString() });
    expect(store.getLatestSequenceNumber('sess-1')).toBe(5);
  });

  it('should delete by session ID', () => {
    const store = new EventStore();
    store.store('sess-1', { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() });
    store.deleteBySessionId('sess-1');
    expect(store.getBySessionId('sess-1')).toHaveLength(0);
  });

  it('should return empty array for non-existent session', () => {
    const store = new EventStore();
    expect(store.getBySessionId('non-existent')).toEqual([]);
  });

  it('should list all session IDs', () => {
    const store = new EventStore();
    store.store('sess-1', { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() });
    store.store('sess-2', { id: 'e2', sessionId: 'sess-2', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() });
    expect(store.getAllSessions()).toEqual(['sess-1', 'sess-2']);
  });
});

describe('EventOrdering', () => {
  const ordering = new EventOrdering();

  it('should sequence events by number', () => {
    const events: TimelineEvent[] = [
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 2, timestamp: '2024-01-01T00:00:00Z' },
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z' },
    ];
    const sorted = ordering.sequenceEvents(events);
    expect(sorted[0]?.id).toBe('e1');
  });

  it('should detect gaps', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 3, timestamp: new Date().toISOString() },
    ];
    const gaps = ordering.detectGaps(events);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.missingNumber).toBe(2);
  });

  it('should return empty gaps for empty events', () => {
    expect(ordering.detectGaps([])).toEqual([]);
  });

  it('should fill gaps with placeholder events', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
      { id: 'e3', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 3, timestamp: new Date().toISOString() },
    ];
    const filled = ordering.fillGaps(events);
    expect(filled).toHaveLength(3);
  });

  it('should return sorted events if no gaps', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 2, timestamp: new Date().toISOString() },
    ];
    expect(ordering.fillGaps(events)).toHaveLength(2);
  });

  it('should reorder by causality', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString(), causationId: 'c1' },
      { id: 'e2', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 2, timestamp: new Date().toISOString(), causationId: 'c1' },
    ];
    const ordered = ordering.reorderByCausality(events);
    expect(ordered).toHaveLength(2);
  });

  it('should return empty for empty events in reorderByCausality', () => {
    expect(ordering.reorderByCausality([])).toEqual([]);
  });

  it('should validate sequencing', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_ACTIVATED', sequenceNumber: 2, timestamp: new Date().toISOString() },
    ];
    const result = ordering.validateSequencing(events);
    expect(result.valid).toBe(true);
  });

  it('should detect issues in sequencing', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 2, timestamp: new Date().toISOString() },
      { id: 'e2', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 3, timestamp: new Date().toISOString() },
    ];
    const result = ordering.validateSequencing(events);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('First sequence number'))).toBe(true);
  });

  it('should return valid for empty events in validateSequencing', () => {
    expect(ordering.validateSequencing([])).toEqual({ valid: true, issues: [] });
  });
});

describe('query functions', () => {
  const events: TimelineEvent[] = [
    { id: 'e1', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z' },
    { id: 'e2', sessionId: 'sess-1', eventType: 'SNAPSHOT_CAPTURED', sequenceNumber: 2, timestamp: '2024-01-02T00:00:00Z' },
    { id: 'e3', sessionId: 'sess-1', eventType: 'AI_INTERACTION', sequenceNumber: 3, timestamp: '2024-01-03T00:00:00Z', payloadJson: '{"key":"value"}' },
    { id: 'e4', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 4, timestamp: '2024-01-04T00:00:00Z' },
  ];

  it('should query events with filter', () => {
    const result = queryEvents(events, { types: ['HYPOTHESIS_FORMED'] });
    expect(result).toHaveLength(1);
  });

  it('should query events with date range', () => {
    const result = queryEvents(events, { dateFrom: '2024-01-02T00:00:00Z', dateTo: '2024-01-03T00:00:00Z' });
    expect(result).toHaveLength(2);
  });

  it('should query events with keywords', () => {
    const result = queryEvents(events, { keywords: ['value'] });
    expect(result).toHaveLength(1);
  });

  it('should return empty for no matching query', () => {
    const result = queryEvents(events, { keywords: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('should get hypothesis events', () => {
    const result = getHypothesisEvents(events);
    expect(result).toHaveLength(1);
  });

  it('should get snapshot events', () => {
    const result = getSnapshotEvents(events);
    expect(result).toHaveLength(1);
  });

  it('should get interaction events', () => {
    const result = getInteractionEvents(events);
    expect(result).toHaveLength(1);
  });

  it('should search events by query string', () => {
    const result = searchEvents(events, 'AI_INTERACTION');
    expect(result).toHaveLength(1);
  });

  it('should return empty for empty search query', () => {
    expect(searchEvents(events, '')).toEqual([]);
  });
});

describe('compression', () => {
  it('should compress redundant events', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z', causationId: 'c1' },
      { id: 'e2', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 2, timestamp: '2024-01-02T00:00:00Z', causationId: 'c1', payloadJson: '{"updated":true}' },
      { id: 'e3', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 3, timestamp: '2024-01-03T00:00:00Z' },
    ];
    const compressed = compressTimeline(events);
    expect(compressed).toHaveLength(2);
  });

  it('should return empty for empty events', () => {
    expect(compressTimeline([])).toEqual([]);
  });

  it('should decompress by returning copy', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
    ];
    const decompressed = decompressTimeline(events);
    expect(decompressed).toHaveLength(1);
    expect(decompressed[0]).not.toBe(events[0]);
  });

  it('should summarize timeline', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z' },
      { id: 'e2', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 2, timestamp: '2024-01-02T00:00:00Z' },
    ];
    const summary = summarizeTimeline(events);
    expect(summary).toContain('Total events: 2');
  });

  it('should get timeline stats', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: '2024-01-01T00:00:00Z' },
      { id: 'e2', sessionId: 'sess-1', eventType: 'HYPOTHESIS_FORMED', sequenceNumber: 2, timestamp: '2024-01-02T00:00:00Z' },
    ];
    const stats = getTimelineStats(events);
    expect(stats.totalEvents).toBe(2);
    expect(stats.hypothesisEvents).toBe(1);
    expect(stats.timeRange).toBeDefined();
  });

  it('should handle single event stats', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
    ];
    const stats = getTimelineStats(events);
    expect(stats.totalEvents).toBe(1);
    expect(stats.averageIntervalMs).toBeNull();
  });

  it('should be idempotent on compress then decompress', () => {
    const events: TimelineEvent[] = [
      { id: 'e1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', sequenceNumber: 1, timestamp: new Date().toISOString() },
    ];
    const compressed = compressTimeline(events);
    const decompressed = decompressTimeline(compressed);
    expect(decompressed).toHaveLength(1);
  });
});
