import type { MemoryRelation } from '../contracts/memory-contracts.ts';

export interface DependencyGraph {
  readonly nodeIds: readonly string[];
  readonly edges: readonly MemoryRelation[];
  readonly fanIn: Readonly<Record<string, number>>;
  readonly fanOut: Readonly<Record<string, number>>;
}

export class DependencyIndexer {
  private readonly _relations: MemoryRelation[] = [];
  private readonly _bySource: Map<string, string[]> = new Map();
  private readonly _byTarget: Map<string, string[]> = new Map();

  get relationCount(): number {
    return this._relations.length;
  }

  indexRelation(relation: MemoryRelation): void {
    this._relations.push(relation);

    const sourceExisting = this._bySource.get(relation.sourceId) ?? [];
    sourceExisting.push(relation.targetId);
    this._bySource.set(relation.sourceId, sourceExisting);

    const targetExisting = this._byTarget.get(relation.targetId) ?? [];
    targetExisting.push(relation.sourceId);
    this._byTarget.set(relation.targetId, targetExisting);
  }

  getDependencies(nodeId: string): readonly string[] {
    return Object.freeze([...(this._bySource.get(nodeId) ?? [])]);
  }

  getDependents(nodeId: string): readonly string[] {
    return Object.freeze([...(this._byTarget.get(nodeId) ?? [])]);
  }

  getFanIn(nodeId: string): number {
    return (this._byTarget.get(nodeId) ?? []).length;
  }

  getFanOut(nodeId: string): number {
    return (this._bySource.get(nodeId) ?? []).length;
  }

  getInstability(nodeId: string): number {
    const fanOut = this.getFanOut(nodeId);
    const fanIn = this.getFanIn(nodeId);
    const total = fanOut + fanIn;
    return total === 0 ? 0 : fanOut / total;
  }

  buildDependencyGraph(nodeIds: readonly string[]): DependencyGraph {
    const nodeSet = new Set(nodeIds);
    const edges = this._relations.filter(
      r => nodeSet.has(r.sourceId) && nodeSet.has(r.targetId),
    );
    const fanIn: Record<string, number> = {};
    const fanOut: Record<string, number> = {};
    for (const id of nodeIds) {
      fanIn[id] = this.getFanIn(id);
      fanOut[id] = this.getFanOut(id);
    }
    return Object.freeze({
      nodeIds: Object.freeze([...nodeIds].sort()),
      edges: Object.freeze([...edges]),
      fanIn: Object.freeze(fanIn),
      fanOut: Object.freeze(fanOut),
    });
  }

  getAllRelations(): readonly MemoryRelation[] {
    return Object.freeze([...this._relations]);
  }

  clear(): void {
    this._relations.length = 0;
    this._bySource.clear();
    this._byTarget.clear();
  }
}
