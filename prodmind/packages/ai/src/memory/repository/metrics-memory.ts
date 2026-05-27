import type { MetricsMemory } from '../contracts/memory-contracts.ts';

export class MetricsMemoryStore {
  private readonly _entries: Map<string, MetricsMemory> = new Map();
  private readonly _bySnapshot: Map<string, string[]> = new Map();

  get count(): number {
    return this._entries.size;
  }

  store(entry: MetricsMemory): void {
    this._entries.set(entry.id, entry);
    const existing = this._bySnapshot.get(entry.snapshotId) ?? [];
    existing.push(entry.id);
    this._bySnapshot.set(entry.snapshotId, existing);
  }

  get(id: string): MetricsMemory | undefined {
    return this._entries.get(id);
  }

  getBySnapshot(snapshotId: string): readonly MetricsMemory[] {
    const ids = this._bySnapshot.get(snapshotId) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is MetricsMemory => e !== undefined),
    );
  }

  getLatest(): MetricsMemory | undefined {
    const sorted = [...this._entries.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    return sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  }

  getMetricHistory(metricName: string): readonly MetricsMemory[] {
    return Object.freeze(
      [...this._entries.values()]
        .filter(e => e.id.includes(metricName))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    );
  }

  getAll(): readonly MetricsMemory[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  clear(): void {
    this._entries.clear();
    this._bySnapshot.clear();
  }
}
