import { describe, expect, it } from 'vitest';

import { createMemoryRecord } from '../contracts/memory-factories.ts';
import { ExecutionContext } from '../execution/execution-context.ts';
import { ExecutionMemory } from '../execution/execution-memory.ts';
import { SessionState } from '../execution/session-state.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';

/* ------------------------------------------------------------------ */
/*  ExecutionMemory                                                     */
/* ------------------------------------------------------------------ */
describe('ExecutionMemory', () => {
  it('starts empty', () => {
    const em = new ExecutionMemory();
    expect(em.stepCount).toBe(0);
    expect(em.steps).toEqual([]);
    expect(em.records).toEqual([]);
  });

  it('begins a step and assigns id', () => {
    const em = new ExecutionMemory();
    const id = em.beginStep('test', { key: 'val' });
    expect(id).toBeTruthy();
    expect(em.stepCount).toBe(1);
    expect(em.currentId).toBe(id);
  });

  it('completes a step with output and duration', () => {
    const em = new ExecutionMemory();
    const id = em.beginStep('process');
    em.completeStep(id, { result: 'ok' }, 150);
    const step = em.getStep(id)!;
    expect(step.status).toBe('completed');
    expect(step.output).toEqual({ result: 'ok' });
    expect(step.duration).toBe(150);
    expect(em.currentId).toBeUndefined();
  });

  it('fails a step with error', () => {
    const em = new ExecutionMemory();
    const id = em.beginStep('process');
    em.failStep(id, 'something went wrong');
    const step = em.getStep(id)!;
    expect(step.status).toBe('failed');
    expect(step.output).toEqual({ error: 'something went wrong' });
  });

  it('returns undefined for unknown step', () => {
    const em = new ExecutionMemory();
    expect(em.getStep('nope')).toBeUndefined();
  });

  it('filters steps by action', () => {
    const em = new ExecutionMemory();
    em.beginStep('read');
    em.beginStep('write');
    em.beginStep('read');
    expect(em.getStepsByAction('read')).toHaveLength(2);
    expect(em.getStepsByAction('write')).toHaveLength(1);
  });

  it('clears all state', () => {
    const em = new ExecutionMemory();
    em.beginStep('test');
    em.clear();
    expect(em.stepCount).toBe(0);
    expect(em.currentId).toBeUndefined();
  });

  it('completeStep is noop for unknown id', () => {
    const em = new ExecutionMemory();
    em.completeStep('nope', {}, 0);
    expect(em.stepCount).toBe(0);
  });

  it('failStep is noop for unknown id', () => {
    const em = new ExecutionMemory();
    em.failStep('nope', 'err');
    expect(em.stepCount).toBe(0);
  });

  it('stores memory records for each step', () => {
    const em = new ExecutionMemory();
    const id = em.beginStep('calc', { x: 1 });
    em.completeStep(id, { result: 2 }, 10);
    expect(em.records.length).toBeGreaterThanOrEqual(1);
    const rec = em.records[0]!;
    expect(rec.category).toBe('execution');
  });
});

/* ------------------------------------------------------------------ */
/*  SessionState                                                        */
/* ------------------------------------------------------------------ */
describe('SessionState', () => {
  it('starts active with an id', () => {
    const s = new SessionState();
    expect(s.id).toBeTruthy();
    expect(s.status).toBe('active');
  });

  it('pauses and resumes', () => {
    const s = new SessionState();
    s.pause();
    expect(s.status).toBe('paused');
    s.resume();
    expect(s.status).toBe('active');
  });

  it('completes', () => {
    const s = new SessionState();
    s.complete();
    expect(s.status).toBe('completed');
  });

  it('fails', () => {
    const s = new SessionState();
    s.fail();
    expect(s.status).toBe('failed');
  });

  it('manages tags', () => {
    const s = new SessionState();
    s.addTag('critical');
    s.addTag('urgent');
    expect(s.hasTag('critical')).toBe(true);
    expect(s.hasTag('missing')).toBe(false);
    expect(s.tags).toHaveLength(2);
  });

  it('manages variables', () => {
    const s = new SessionState();
    s.setVariable('key1', 'val1');
    s.setVariable('key2', 42);
    expect(s.getVariable('key1')).toBe('val1');
    expect(s.getVariable('key2')).toBe(42);
    expect(s.getVariable('missing')).toBeUndefined();
  });

  it('clears variables', () => {
    const s = new SessionState();
    s.setVariable('key', 'val');
    s.clearVariables();
    expect(s.getVariable('key')).toBeUndefined();
  });

  it('records touch timestamps', () => {
    const s = new SessionState();
    const first = s.lastActiveAt;
    s.touch();
    expect(s.lastActiveAt).toBeGreaterThanOrEqual(first);
  });

  it('stores records and updates metadata', () => {
    const s = new SessionState();
    const r = createMemoryRecord({ category: 'execution' });
    s.addRecord(r);
    expect(s.records).toHaveLength(1);
    expect(s.metadata.stepCount).toBe(1);
    expect(s.metadata.id).toBe(s.id);
  });

  it('accepts custom session id', () => {
    const s = new SessionState('my_session');
    expect(s.id).toBe('my_session');
  });
});

/* ------------------------------------------------------------------ */
/*  ExecutionContext                                                    */
/* ------------------------------------------------------------------ */
describe('ExecutionContext', () => {
  it('creates context with execution + session', () => {
    const ctx = new ExecutionContext();
    expect(ctx.execution.stepCount).toBe(0);
    expect(ctx.session.status).toBe('active');
  });

  it('begins a step and traverses all layers', () => {
    const store = new GraphMemoryStore();
    const ctx = new ExecutionContext(store, { tags: ['critical'] });
    const stepId = ctx.begin('analyze', { data: 'test' });
    expect(stepId).toBeTruthy();
    expect(ctx.execution.stepCount).toBe(1);
    expect(ctx.session.records.length).toBeGreaterThanOrEqual(1);
    expect(ctx.session.hasTag('critical')).toBe(true);
    expect(store.recordCount()).toBe(1);
  });

  it('completes a step', () => {
    const ctx = new ExecutionContext();
    const id = ctx.begin('process');
    ctx.complete(id, { result: 'done' }, 100);
    const step = ctx.execution.getStep(id)!;
    expect(step.status).toBe('completed');
  });

  it('fails a step and marks session failed', () => {
    const ctx = new ExecutionContext();
    const id = ctx.begin('process');
    ctx.fail(id, 'error');
    expect(ctx.execution.getStep(id)?.status).toBe('failed');
    expect(ctx.session.status).toBe('failed');
  });

  it('generates snapshot', () => {
    const ctx = new ExecutionContext();
    const id = ctx.begin('process');
    ctx.complete(id, {}, 5);
    const snap = ctx.snapshot();
    expect(snap.execution).toHaveLength(1);
    expect(snap.session.stepCount).toBe(1);
  });

  it('initializes with tags', () => {
    const ctx = new ExecutionContext(undefined, { tags: ['a', 'b'] });
    expect(ctx.session.hasTag('a')).toBe(true);
    expect(ctx.session.hasTag('b')).toBe(true);
  });
});
