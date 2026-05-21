import { SemanticIndex } from './semantic-index.ts';

export interface DependencyEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: string;
}

export class DependencyIndex {
  private readonly _forward: Map<string, DependencyEdge[]> = new Map();
  private readonly _reverse: Map<string, DependencyEdge[]> = new Map();
  private readonly _index: SemanticIndex;

  constructor() {
    this._index = new SemanticIndex();
  }

  addDependency(from: string, to: string, kind = 'depends_on'): void {
    const edge: DependencyEdge = { from, to, kind };
    this.addToMap(this._forward, from, edge);
    this.addToMap(this._reverse, to, edge);
  }

  getDependents(id: string): readonly DependencyEdge[] {
    return Object.freeze(
      (this._forward.get(id) ?? []).sort((a, b) => a.to.localeCompare(b.to)),
    );
  }

  getDependencies(id: string): readonly DependencyEdge[] {
    return Object.freeze(
      (this._reverse.get(id) ?? []).sort((a, b) => a.from.localeCompare(b.from)),
    );
  }

  hasDependency(from: string, to: string): boolean {
    return (this._forward.get(from) ?? []).some(e => e.to === to);
  }

  remove(id: string): number {
    const forwardEdges = this._forward.get(id)?.length ?? 0;
    this._forward.delete(id);
    this._reverse.delete(id);
    return forwardEdges;
  }

  clear(): void {
    this._forward.clear();
    this._reverse.clear();
    this._index.clear();
  }

  get size(): number {
    let count = 0;
    for (const edges of this._forward.values()) count += edges.length;
    return count;
  }

  private addToMap(map: Map<string, DependencyEdge[]>, key: string, edge: DependencyEdge): void {
    const existing = map.get(key);
    if (existing) {
      existing.push(edge);
    } else {
      map.set(key, [edge]);
    }
  }
}
