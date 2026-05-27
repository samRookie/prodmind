import type { GraphMemory } from '../contracts/memory-contracts.ts';

export class GraphMemoryStoreRepo {
  private readonly _entries: Map<string, GraphMemory> = new Map();
  private readonly _bySnapshot: Map<string, string[]> = new Map();

  get count(): number {
    return this._entries.size;
  }

  store(entry: GraphMemory): void {
    this._entries.set(entry.id, entry);
    const existing = this._bySnapshot.get(entry.snapshotId) ?? [];
    existing.push(entry.id);
    this._bySnapshot.set(entry.snapshotId, existing);
  }

  get(id: string): GraphMemory | undefined {
    return this._entries.get(id);
  }

  getBySnapshot(snapshotId: string): readonly GraphMemory[] {
    const ids = this._bySnapshot.get(snapshotId) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is GraphMemory => e !== undefined),
    );
  }

  getLatest(): GraphMemory | undefined {
    const sorted = [...this._entries.values()].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    return sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  }

  getAll(): readonly GraphMemory[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  clear(): void {
    this._entries.clear();
    this._bySnapshot.clear();
  }
}
