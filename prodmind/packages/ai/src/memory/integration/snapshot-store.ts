import type { MemorySnapshot } from '../contracts/memory-snapshot.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';

export class SnapshotStore {
  private readonly _snapshots: Map<string, MemorySnapshot> = new Map();

  save(id: string, store: GraphMemoryStore): void {
    this._snapshots.set(id, store.takeSnapshot(id));
  }

  load(id: string, store: GraphMemoryStore): boolean {
    const snap = this._snapshots.get(id);
    if (!snap) return false;
    store.restoreSnapshot(snap);
    return true;
  }

  remove(id: string): void {
    this._snapshots.delete(id);
  }

  clear(): void {
    this._snapshots.clear();
  }

  exists(id: string): boolean {
    return this._snapshots.has(id);
  }

  get size(): number {
    return this._snapshots.size;
  }
}
