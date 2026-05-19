export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
}

const points: MetricPoint[] = [];

export function recordMetric(name: string, value: number): void {
  points.push({ name, value, timestamp: new Date() });
}

export function getMetrics(name: string): MetricPoint[] {
  return points.filter((p) => p.name === name);
}

export function averageMetric(name: string): number {
  const filtered = points.filter((p) => p.name === name);
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, p) => sum + p.value, 0) / filtered.length;
}
