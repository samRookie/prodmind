import type { MemorySnapshot } from '../contracts/memory-snapshot.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';

export interface SnapshotVersion {
  readonly id: string;
  readonly version: string;
  readonly createdAt: string;
  readonly description: string;
}

export class SnapshotManager {
  private readonly _snapshots: Map<string, MemorySnapshot> = new Map();
  private readonly _versions: SnapshotVersion[] = [];
  private _versionCounter = 0;

  get versions(): readonly SnapshotVersion[] {
    return Object.freeze([...this._versions]);
  }

  takeSnapshot(store: GraphMemoryStore, description = ''): SnapshotVersion {
    this._versionCounter++;
    const version = `1.${this._versionCounter}`;
    const id = `snap_${this._versionCounter}`;
    const snapshot = store.takeSnapshot(id);

    const versionInfo: SnapshotVersion = Object.freeze({
      id,
      version,
      createdAt: snapshot.createdAt,
      description,
    });

    this._snapshots.set(version, snapshot);
    this._versions.push(versionInfo);

    return versionInfo;
  }

  restoreSnapshot(store: GraphMemoryStore, version: string): boolean {
    const snapshot = this._snapshots.get(version);
    if (!snapshot) return false;
    store.restoreSnapshot(snapshot);
    return true;
  }

  getSnapshot(version: string): MemorySnapshot | undefined {
    return this._snapshots.get(version);
  }

  getLatestSnapshot(): MemorySnapshot | undefined {
    if (this._versions.length === 0) return undefined;
    const latest = this._versions[this._versions.length - 1]!;
    return this._snapshots.get(latest.version);
  }

  getLatestVersion(): SnapshotVersion | undefined {
    if (this._versions.length === 0) return undefined;
    return this._versions[this._versions.length - 1];
  }

  hasVersion(version: string): boolean {
    return this._snapshots.has(version);
  }

  removeSnapshot(version: string): boolean {
    const existed = this._snapshots.delete(version);
    if (existed) {
      const idx = this._versions.findIndex(v => v.version === version);
      if (idx >= 0) this._versions.splice(idx, 1);
    }
    return existed;
  }

  clear(): void {
    this._snapshots.clear();
    this._versions.length = 0;
    this._versionCounter = 0;
  }

  get snapshotCount(): number {
    return this._snapshots.size;
  }
}
