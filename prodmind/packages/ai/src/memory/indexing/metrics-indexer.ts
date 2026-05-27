import type { MetricsMemory } from '../contracts/memory-contracts.ts';

export interface MetricTrend {
  readonly metricName: string;
  readonly values: readonly { snapshotId: string; value: number; timestamp: string }[];
  readonly direction: 'increasing' | 'decreasing' | 'stable';
}

export class MetricsIndexer {
  private readonly _byMetric: Map<string, MetricsMemory[]> = new Map();
  private readonly _bySnapshot: Map<string, string[]> = new Map();

  get metricCount(): number {
    return this._byMetric.size;
  }

  index(entry: MetricsMemory): void {
    const metricName = entry.id;
    const existing = this._byMetric.get(metricName) ?? [];
    existing.push(entry);
    this._byMetric.set(metricName, existing);

    const snapExisting = this._bySnapshot.get(entry.snapshotId) ?? [];
    snapExisting.push(entry.id);
    this._bySnapshot.set(entry.snapshotId, snapExisting);
  }

  getMetricHistory(metricName: string): readonly MetricsMemory[] {
    return Object.freeze([...(this._byMetric.get(metricName) ?? [])]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  }

  getBySnapshot(snapshotId: string): readonly MetricsMemory[] {
    const ids = this._bySnapshot.get(snapshotId) ?? [];
    return Object.freeze(
      ids.map(id => {
        for (const entries of this._byMetric.values()) {
          const found = entries.find(e => e.id === id);
          if (found) return found;
        }
        return undefined;
      }).filter((e): e is MetricsMemory => e !== undefined),
    );
  }

  getTrend(metricName: string): MetricTrend | undefined {
    const values = this.getMetricHistory(metricName);
    if (values.length < 2) return undefined;

    const points = values.map(v => ({
      snapshotId: v.snapshotId,
      value: v.instability,
      timestamp: v.timestamp,
    }));

    const first = points[0]!.value;
    const last = points[points.length - 1]!.value;
    const diff = last - first;
    const direction: MetricTrend['direction'] = diff > 0.05 ? 'increasing' : diff < -0.05 ? 'decreasing' : 'stable';

    return Object.freeze({
      metricName,
      values: Object.freeze(points),
      direction,
    });
  }

  getAllMetrics(): readonly string[] {
    return Object.freeze([...this._byMetric.keys()].sort());
  }

  clear(): void {
    this._byMetric.clear();
    this._bySnapshot.clear();
  }
}
