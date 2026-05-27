import type { GraphMemory } from '../contracts/memory-contracts.ts';

export interface GraphIndexEntry {
  readonly snapshotId: string;
  readonly graphMemory: GraphMemory;
  readonly densityCategory: 'sparse' | 'moderate' | 'dense';
}

export class GraphIndexer {
  private readonly _bySnapshot: Map<string, GraphMemory> = new Map();
  private readonly _byDensity: Map<string, string[]> = new Map();
  private _entries: GraphMemory[] = [];

  get count(): number {
    return this._entries.length;
  }

  index(graph: GraphMemory): void {
    this._entries.push(graph);
    this._bySnapshot.set(graph.snapshotId, graph);

    const density = this._categorizeDensity(graph.density);
    const existing = this._byDensity.get(density) ?? [];
    existing.push(graph.id);
    this._byDensity.set(density, existing);
  }

  getBySnapshot(snapshotId: string): GraphMemory | undefined {
    return this._bySnapshot.get(snapshotId);
  }

  getByDensity(density: string): readonly GraphMemory[] {
    const ids = this._byDensity.get(density) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.find(e => e.id === id)).filter((e): e is GraphMemory => e !== undefined),
    );
  }

  getDensityTrend(): readonly { snapshotId: string; density: number }[] {
    return Object.freeze(
      this._entries
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map(e => ({ snapshotId: e.snapshotId, density: e.density })),
    );
  }

  getAll(): readonly GraphMemory[] {
    return Object.freeze([...this._entries].sort((a, b) => a.id.localeCompare(b.id)));
  }

  clear(): void {
    this._entries = [];
    this._bySnapshot.clear();
    this._byDensity.clear();
  }

  private _categorizeDensity(density: number): 'sparse' | 'moderate' | 'dense' {
    if (density < 0.1) return 'sparse';
    if (density < 0.4) return 'moderate';
    return 'dense';
  }
}
