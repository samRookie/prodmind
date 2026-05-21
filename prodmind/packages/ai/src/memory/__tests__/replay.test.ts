import { describe, expect, it, vi } from 'vitest';

import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { ReplayEngine } from '../replay/replay-engine.ts';
import { ReplayRecorder } from '../replay/replay-recorder.ts';
import { ReplayScheduler } from '../replay/replay-scheduler.ts';

/* ------------------------------------------------------------------ */
/*  ReplayRecorder                                                      */
/* ------------------------------------------------------------------ */
describe('ReplayRecorder', () => {
  it('starts empty', () => {
    const r = new ReplayRecorder();
    expect(r.eventCount).toBe(0);
    expect(r.events).toEqual([]);
  });

  it('records an event without store', () => {
    const r = new ReplayRecorder();
    const evt = r.record('tool_call', { tool: 'read' }, 'orchestration', 'orch_1');
    expect(evt.type).toBe('tool_call');
    expect(evt.payload).toEqual({ tool: 'read' });
    expect(evt.id).toBeTruthy();
    expect(evt.provenanceId).toBeTruthy();
    expect(r.eventCount).toBe(1);
    expect(r.lastEventId).toBe(evt.id);
  });

  it('chains parentId', () => {
    const r = new ReplayRecorder();
    const e1 = r.record('a', {}, 'manual', 's1');
    const e2 = r.record('b', {}, 'manual', 's2');
    expect(e2.parentId).toBe(e1.id);
  });

  it('records to store when provided', () => {
    const store = new GraphMemoryStore();
    const r = new ReplayRecorder(store);
    r.record('test', { x: 1 }, 'orchestration', 'o1');
    expect(store.recordCount()).toBe(1);
    expect(store.provenances.length).toBe(1);
  });

  it('clears', () => {
    const r = new ReplayRecorder();
    r.record('a', {}, 'manual', 's');
    r.clear();
    expect(r.eventCount).toBe(0);
    expect(r.lastEventId).toBeUndefined();
  });

  it('returns frozen events', () => {
    const r = new ReplayRecorder();
    const evt = r.record('a', {}, 'manual', 's');
    expect(Object.isFrozen(evt)).toBe(true);
    expect(Object.isFrozen(r.events)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ReplayScheduler                                                     */
/* ------------------------------------------------------------------ */
describe('ReplayScheduler', () => {
  it('dispatches events to registered handlers', async () => {
    const s = new ReplayScheduler();
    const handler = vi.fn();
    s.on('tool_call', handler);
    await s.replay([{ id: 'e1', type: 'tool_call', payload: {}, timestamp: 0, provenanceId: 'p1' }]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('dispatches to wildcard handler', async () => {
    const s = new ReplayScheduler();
    const handler = vi.fn();
    s.on('*', handler);
    await s.replay([{ id: 'e1', type: 'any', payload: {}, timestamp: 0, provenanceId: 'p1' }]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unregisters a handler', async () => {
    const s = new ReplayScheduler();
    const handler = vi.fn();
    s.on('test', handler);
    s.off('test', handler);
    await s.replay([{ id: 'e1', type: 'test', payload: {}, timestamp: 0, provenanceId: 'p1' }]);
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears all handlers', async () => {
    const s = new ReplayScheduler();
    s.on('test', vi.fn());
    s.clearHandlers();
    await s.replay([{ id: 'e1', type: 'test', payload: {}, timestamp: 0, provenanceId: 'p1' }]);
    // no throw = pass
  });

  it('adjusts speed', () => {
    const s = new ReplayScheduler();
    expect(s.speed).toBe(1);
    s.setSpeed(2);
    expect(s.speed).toBe(2);
    s.setSpeed(-1);
    expect(s.speed).toBe(0.1);
  });
});

/* ------------------------------------------------------------------ */
/*  ReplayEngine                                                        */
/* ------------------------------------------------------------------ */
describe('ReplayEngine', () => {
  it('creates engine with recorder and scheduler', () => {
    const e = new ReplayEngine();
    expect(e.recorder.eventCount).toBe(0);
    expect(e.scheduler.speed).toBe(1);
  });

  it('records via engine shortcut', () => {
    const e = new ReplayEngine();
    const evt = e.record('tool_call', { tool: 'read' }, 'orchestration', 'o1');
    expect(evt).toBeTruthy();
    expect(e.recorder.eventCount).toBe(1);
  });

  it('replays with onEvent callback', async () => {
    const e = new ReplayEngine();
    e.record('a', {}, 'manual', 's1');
    e.record('b', {}, 'manual', 's2');
    const handler = vi.fn();
    await e.replay({ onEvent: handler });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('snapshotAndRestore does not throw', () => {
    const e = new ReplayEngine();
    e.record('a', {}, 'manual', 's');
    expect(() => e.snapshotAndRestore()).not.toThrow();
  });
});
