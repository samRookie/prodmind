import { describe, it, expect } from 'vitest';
import { Tracer, generateTraceId } from '../tracing.ts';

describe('Tracer', () => {
  it('starts empty', () => {
    const tracer = new Tracer();
    expect(tracer.getAllSpans()).toHaveLength(0);
  });

  it('creates a span with traceId and operation', () => {
    const tracer = new Tracer();
    const traceId = generateTraceId();
    const span = tracer.startSpan('test-op', traceId);
    expect(span.traceId).toBe(traceId);
    expect(span.operation).toBe('test-op');
    expect(span.spanId).toBeTruthy();
    expect(span.startTime).toBeGreaterThan(0);
  });

  it('links parent span to child', () => {
    const tracer = new Tracer();
    const traceId = generateTraceId();
    const parent = tracer.startSpan('parent', traceId);
    const child = tracer.startSpan('child', traceId, parent);
    expect(child.parentSpanId).toBe(parent.spanId);
  });

  it('endSpan sets endTime and status', () => {
    const tracer = new Tracer();
    const traceId = generateTraceId();
    const span = tracer.startSpan('op', traceId);
    const ended = tracer.endSpan(span, 'ok');
    expect(ended.endTime).toBeGreaterThanOrEqual(ended.startTime);
    expect(ended.status).toBe('ok');
  });

  it('getTrace returns spans for a specific trace', () => {
    const tracer = new Tracer();
    const trace1 = generateTraceId();
    const trace2 = generateTraceId();
    tracer.startSpan('a', trace1);
    tracer.startSpan('b', trace1);
    tracer.startSpan('c', trace2);
    expect(tracer.getTrace(trace1)).toHaveLength(2);
    expect(tracer.getTrace(trace2)).toHaveLength(1);
  });

  it('clear removes all spans', () => {
    const tracer = new Tracer();
    const traceId = generateTraceId();
    tracer.startSpan('op', traceId);
    tracer.clear();
    expect(tracer.getAllSpans()).toHaveLength(0);
  });

  it('generateTraceId returns unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateTraceId());
    }
    expect(ids.size).toBe(100);
  });
});
