import { describe, expect,it } from 'vitest';

import { AssemblyTracer } from '../tracing/assembly-tracer.ts';

describe('AssemblyTracer', () => {
  it('records operations', () => {
    const tracer = new AssemblyTracer();
    tracer.start();
    tracer.record('retrieve', { strategy: 'test' }, 10, 5, 1);
    tracer.record('rank', { count: 10 }, 5, 10);
    const trace = tracer.snapshot();
    expect(trace.entries).toHaveLength(2);
    expect(trace.operationCount).toBe(2);
    expect(trace.totalDurationMs).toBe(15);
  });

  it('computes metrics', () => {
    const tracer = new AssemblyTracer();
    tracer.start();
    tracer.record('retrieve', {}, 10, 50, 5);
    tracer.record('dedup', {}, 5, 40, 10);
    const m = tracer.metrics(1000, 0.75);
    expect(m.totalRetrieved).toBe(50);
    expect(m.totalDeduped).toBe(40);
    expect(m.totalDiscarded).toBe(15);
    expect(m.finalTokenCount).toBe(1000);
    expect(m.budgetUtilization).toBe(0.75);
  });

  it('returns empty trace if never started', () => {
    const tracer = new AssemblyTracer();
    const trace = tracer.snapshot();
    expect(trace.entries).toHaveLength(0);
  });

  it('tracks the correct duration', () => {
    const tracer = new AssemblyTracer();
    tracer.start();
    tracer.record('slice', {}, 42, 3);
    const m = tracer.metrics(500, 0.5);
    expect(m.assemblyDurationMs).toBeGreaterThanOrEqual(0);
  });
});
