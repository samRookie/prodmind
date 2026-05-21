import { describe, expect, it } from 'vitest';

import { ReplaySession } from '../replay/replay-session.ts';
import { ProvenanceTracker } from '../provenance/provenance-tracker.ts';
import { CapabilityEventBus, type CapabilityEvent } from '../events/event-system.ts';
import type { ToolExecutionResult } from '../contracts/tool-result.ts';

function makeResult(toolId: string, status: 'completed' | 'failed' = 'completed'): ToolExecutionResult {
  return Object.freeze({
    request: Object.freeze({
      toolId, input: Object.freeze({}), traceId: `${toolId}_tr`, timestamp: 0,
    }),
    status,
    output: status === 'completed' ? Object.freeze({}) : null,
    error: status === 'failed' ? 'err' : null,
    failureCode: status === 'failed' ? 'internal_error' as const : null,
    durationMs: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  ReplaySession                                                       */
/* ------------------------------------------------------------------ */
describe('ReplaySession', () => {
  it('starts empty', () => {
    const rs = new ReplaySession();
    expect(rs.count).toBe(0);
    expect(rs.steps).toHaveLength(0);
  });

  it('records results', () => {
    const rs = new ReplaySession();
    rs.record(makeResult('t1'));
    rs.record(makeResult('t2'));
    expect(rs.count).toBe(2);
    expect(rs.steps[0]?.result.request.toolId).toBe('t1');
    expect(rs.steps[1]?.result.request.toolId).toBe('t2');
  });

  it('replays in order', () => {
    const rs = new ReplaySession();
    rs.record(makeResult('a'));
    rs.record(makeResult('b'));
    const replayed = rs.replay();
    expect(replayed).toHaveLength(2);
    expect(replayed[0]?.request.toolId).toBe('a');
  });

  it('iterates with generator', () => {
    const rs = new ReplaySession();
    rs.record(makeResult('t'));
    const results: string[] = [];
    for (const step of rs.iterate()) {
      results.push(step.result.request.toolId);
    }
    expect(results).toEqual(['t']);
  });

  it('clears', () => {
    const rs = new ReplaySession();
    rs.record(makeResult('t'));
    rs.clear();
    expect(rs.count).toBe(0);
  });

  it('freezes steps', () => {
    const rs = new ReplaySession();
    rs.record(makeResult('t'));
    expect(Object.isFrozen(rs.steps)).toBe(true);
    expect(Object.isFrozen(rs.steps[0]!)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ProvenanceTracker                                                   */
/* ------------------------------------------------------------------ */
describe('ProvenanceTracker', () => {
  it('starts empty', () => {
    const pt = new ProvenanceTracker();
    expect(pt.entries.size).toBe(0);
  });

  it('adds entries', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('tr1', 'analysis', 'tool_a');
    expect(pt.getEntry('tr1')?.source).toBe('analysis');
  });

  it('builds parent chain', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('tr3', 'validation', 'tool_c', 'tr2');
    pt.addEntry('tr2', 'analysis', 'tool_b', 'tr1');
    pt.addEntry('tr1', 'analysis', 'tool_a');
    const chain = pt.getChain('tr3');
    expect(chain).toHaveLength(3);
    expect(chain[0]?.traceId).toBe('tr3');
    expect(chain[1]?.traceId).toBe('tr2');
    expect(chain[2]?.traceId).toBe('tr1');
  });

  it('returns empty chain for unknown trace', () => {
    const pt = new ProvenanceTracker();
    expect(pt.getChain('unknown')).toHaveLength(0);
  });

  it('filters by source', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('a', 'analysis', 't1');
    pt.addEntry('b', 'validation', 't2');
    pt.addEntry('c', 'analysis', 't3');
    expect(pt.getBySource('analysis')).toHaveLength(2);
  });

  it('clears', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('a', 's', 't');
    pt.clear();
    expect(pt.entries.size).toBe(0);
  });

  it('freezes entries', () => {
    const pt = new ProvenanceTracker();
    pt.addEntry('tr', 'src', 'tool');
    const entry = pt.getEntry('tr')!;
    expect(Object.isFrozen(entry)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  CapabilityEventBus                                                  */
/* ------------------------------------------------------------------ */
describe('CapabilityEventBus', () => {
  it('starts with no listeners', () => {
    const bus = new CapabilityEventBus();
    expect(bus.listenerCount('tool:before')).toBe(0);
  });

  it('registers and fires handlers', () => {
    const bus = new CapabilityEventBus();
    const captured: string[] = [];
    bus.on('tool:before', e => captured.push(e.type));
    bus.emit('tool:before', { toolId: 't1' });
    expect(captured).toEqual(['tool:before']);
  });

  it('passes payload', () => {
    const bus = new CapabilityEventBus();
    const captured: unknown[] = [];
    bus.on('tool:after', e => captured.push(e.payload));
    bus.emit('tool:after', { toolId: 't1', durationMs: 5 });
    expect(captured[0]).toEqual({ toolId: 't1', durationMs: 5 });
  });

  it('does not fire after off()', () => {
    const bus = new CapabilityEventBus();
    const captured: string[] = [];
    const handler = (e: CapabilityEvent) => captured.push(e.type);
    bus.on('tool:error', handler);
    bus.off('tool:error', handler);
    bus.emit('tool:error', { toolId: 't1' });
    expect(captured).toHaveLength(0);
  });

  it('supports multiple handlers per event', () => {
    const bus = new CapabilityEventBus();
    let count = 0;
    bus.on('session:start', () => count++);
    bus.on('session:start', () => count++);
    bus.emit('session:start', {});
    expect(count).toBe(2);
  });

  it('clears all handlers', () => {
    const bus = new CapabilityEventBus();
    bus.on('tool:before', () => { });
    bus.clear();
    expect(bus.listenerCount('tool:before')).toBe(0);
  });

  it('freezes events', () => {
    const bus = new CapabilityEventBus();
    const captured: CapabilityEvent[] = [];
    bus.on('tool:after', e => captured.push(e));
    bus.emit('tool:after', { x: 1 });
    expect(Object.isFrozen(captured[0])).toBe(true);
    expect(Object.isFrozen(captured[0]?.payload)).toBe(true);
  });
});
