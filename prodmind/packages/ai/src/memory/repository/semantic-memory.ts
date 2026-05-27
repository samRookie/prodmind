import type { SemanticMemory } from '../contracts/memory-contracts.ts';

export class SemanticMemoryStore {
  private readonly _entries: Map<string, SemanticMemory> = new Map();
  private readonly _byConcept: Map<string, string[]> = new Map();

  get count(): number {
    return this._entries.size;
  }

  store(entry: SemanticMemory): void {
    this._entries.set(entry.id, entry);
    const existing = this._byConcept.get(entry.concept) ?? [];
    existing.push(entry.id);
    this._byConcept.set(entry.concept, existing);
  }

  get(id: string): SemanticMemory | undefined {
    return this._entries.get(id);
  }

  getByConcept(concept: string): readonly SemanticMemory[] {
    const ids = this._byConcept.get(concept) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is SemanticMemory => e !== undefined),
    );
  }

  search(term: string): readonly SemanticMemory[] {
    const lower = term.toLowerCase();
    return Object.freeze(
      [...this._entries.values()]
        .filter(e => e.concept.toLowerCase().includes(lower) || e.context.toLowerCase().includes(lower))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getAll(): readonly SemanticMemory[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  clear(): void {
    this._entries.clear();
    this._byConcept.clear();
  }
}
