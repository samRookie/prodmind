import type { MemorySnapshot } from '../contracts/memory-snapshot.ts';

export interface SnapshotRecord {
  readonly id: string;
  readonly snapshot: MemorySnapshot;
  readonly timestamp: number;
  readonly parentId: string;
}

export class SnapshotMemory {
  private readonly _snapshots: Map<string, SnapshotRecord> = new Map();
  private readonly _lineage: Map<string, string[]> = new Map();

  get count(): number {
    return this._snapshots.size;
  }

  store(id: string, snapshot: MemorySnapshot, parentId = ''): SnapshotRecord {
    const record: SnapshotRecord = Object.freeze({
      id,
      snapshot,
      timestamp: Date.now(),
      parentId,
    });
    this._snapshots.set(id, record);
    if (parentId) {
      const children = this._lineage.get(parentId) ?? [];
      children.push(id);
      this._lineage.set(parentId, children);
    }
    return record;
  }

  get(id: string): SnapshotRecord | undefined {
    return this._snapshots.get(id);
  }

  getChildren(parentId: string): readonly SnapshotRecord[] {
    const childIds = this._lineage.get(parentId) ?? [];
    return Object.freeze(
      childIds.map(id => this._snapshots.get(id)).filter((s): s is SnapshotRecord => s !== undefined),
    );
  }

  getAncestors(id: string): readonly SnapshotRecord[] {
    const ancestors: SnapshotRecord[] = [];
    let current = this._snapshots.get(id);
    while (current && current.parentId) {
      const parent = this._snapshots.get(current.parentId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else break;
    }
    return Object.freeze(ancestors);
  }

  getByTimeRange(start: number, end: number): readonly SnapshotRecord[] {
    return Object.freeze(
      [...this._snapshots.values()]
        .filter(s => s.timestamp >= start && s.timestamp <= end)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  getLatest(n: number): readonly SnapshotRecord[] {
    return Object.freeze(
      [...this._snapshots.values()]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, n),
    );
  }

  getAllVersions(): readonly SnapshotRecord[] {
    return Object.freeze(
      [...this._snapshots.values()]
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  delete(id: string): boolean {
    return this._snapshots.delete(id);
  }

  clear(): void {
    this._snapshots.clear();
    this._lineage.clear();
  }
}
