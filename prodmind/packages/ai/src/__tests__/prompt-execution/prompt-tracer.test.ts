import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTracer } from '../../prompts/tracing/prompt-tracer.ts';

describe('PromptTracer', () => {
  let tracer: PromptTracer;

  beforeEach(() => {
    tracer = new PromptTracer();
  });

  it('starts with empty trace', () => {
    const trace = tracer.getTrace();
    expect(trace.entries).toHaveLength(0);
    expect(trace.operationCount).toBe(0);
    expect(trace.totalDurationMs).toBe(0);
  });

  it('records entries in order', () => {
    tracer.record('select', { id: 'test' }, 10);
    tracer.record('render', { tokens: 100 }, 20);
    const trace = tracer.getTrace();
    expect(trace.operationCount).toBe(2);
    expect(trace.entries[0]!.operation).toBe('select');
    expect(trace.entries[1]!.operation).toBe('render');
  });

  it('aggregates total duration', () => {
    tracer.record('stage1', {}, 100);
    tracer.record('stage2', {}, 200);
    const trace = tracer.getTrace();
    expect(trace.totalDurationMs).toBe(300);
  });

  it('returns frozen trace', () => {
    tracer.record('test', {}, 1);
    const trace = tracer.getTrace();
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.entries)).toBe(true);
    expect(Object.isFrozen(trace.entries[0])).toBe(true);
  });

  it('clear() resets all state', () => {
    tracer.record('test', {}, 1);
    tracer.clear();
    const trace = tracer.getTrace();
    expect(trace.entries).toHaveLength(0);
    expect(trace.operationCount).toBe(0);
  });

  it('returns elapsed time from start()', async () => {
    tracer.start();
    await new Promise((r) => setTimeout(r, 10));
    expect(tracer.getElapsedMs()).toBeGreaterThanOrEqual(5);
  });
});
