import { describe, it, expect } from 'vitest';
import { MetricsRegistry } from '../../observability/metrics/metrics-registry.ts';

describe('MetricsRegistry', () => {
  it('increments counters', () => {
    const m = new MetricsRegistry();
    m.increment('requests');
    m.increment('requests');
    expect(m.getCounter('requests')).toBe(2);
  });

  it('records gauges', () => {
    const m = new MetricsRegistry();
    m.gauge('connections', 5);
    expect(m.getGauge('connections')).toBe(5);
  });

  it('records histograms', () => {
    const m = new MetricsRegistry();
    m.record('latency', 10);
    m.record('latency', 20);
    m.record('latency', 30);
    const s = m.getHistogram('latency');
    expect(s?.count).toBe(3);
    expect(s?.avg).toBe(20);
  });
});
