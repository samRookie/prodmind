export interface MetricPoint {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  count: number;
  min: number;
  max: number;
  avg: number;
  last: number;
}

export class MetricsRegistry {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private readonly maxHistogramSize = 1000;

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  record(name: string, value: number): void {
    const existing = this.histograms.get(name) ?? [];
    existing.push(value);
    if (existing.length > this.maxHistogramSize) existing.shift();
    this.histograms.set(name, existing);
  }

  getCounter(name: string): number { return this.counters.get(name) ?? 0; }
  getGauge(name: string): number { return this.gauges.get(name) ?? 0; }

  getHistogram(name: string): MetricSeries | undefined {
    const points = this.histograms.get(name);
    if (!points || points.length === 0) return undefined;
    return {
      name,
      points: points.map(v => ({ name, value: v, timestamp: new Date().toISOString() })),
      count: points.length,
      min: Math.min(...points),
      max: Math.max(...points),
      avg: Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 100) / 100,
      last: points[points.length - 1]!,
    };
  }

  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [name, value] of this.counters) {
      result[`counter:${name}`] = value;
    }
    for (const [name, value] of this.gauges) {
      result[`gauge:${name}`] = value;
    }
    for (const [name] of this.histograms) {
      const series = this.getHistogram(name);
      if (series) result[`histogram:${name}`] = { count: series.count, min: series.min, max: series.max, avg: series.avg, last: series.last };
    }
    return result;
  }

  reset(): void { this.counters.clear(); this.gauges.clear(); this.histograms.clear(); }
}
