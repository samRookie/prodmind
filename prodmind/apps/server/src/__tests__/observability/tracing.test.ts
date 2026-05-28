import { describe, it, expect } from 'vitest';
import { TracingManager } from '../../observability/tracing/tracing-manager.ts';

describe('TracingManager', () => {
  it('starts and ends spans', () => {
    const t = new TracingManager();
    const id = t.startSpan('test', 'runtime');
    t.endSpan(id);
    expect(t.getSpans().length).toBe(1);
    expect(t.getSpans()[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('tracks active spans', () => {
    const t = new TracingManager();
    t.startSpan('active', 'runtime');
    expect(t.getActiveSpans().length).toBe(1);
  });
});
