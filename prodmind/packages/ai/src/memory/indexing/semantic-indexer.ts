import type { MemoryEntry, SemanticMemory } from '../contracts/memory-contracts.ts';

export interface SemanticIndexEntry {
  readonly term: string;
  readonly entryIds: readonly string[];
  readonly score: number;
}

export class SemanticIndexer {
  private readonly _byTerm: Map<string, string[]> = new Map();
  private readonly _byConcept: Map<string, string[]> = new Map();
  private _entries: Map<string, MemoryEntry> = new Map();

  get termCount(): number {
    return this._byTerm.size;
  }

  indexEntry(entry: MemoryEntry): void {
    this._entries.set(entry.id, entry);
    const terms = this._extractTerms(entry);
    for (const term of terms) {
      const existing = this._byTerm.get(term) ?? [];
      if (!existing.includes(entry.id)) {
        existing.push(entry.id);
        this._byTerm.set(term, existing);
      }
    }
  }

  indexSemantic(semantic: SemanticMemory): void {
    const conceptLower = semantic.concept.toLowerCase();
    const existing = this._byConcept.get(conceptLower) ?? [];
    if (!existing.includes(semantic.id)) {
      existing.push(semantic.id);
      this._byConcept.set(conceptLower, existing);
    }
    for (const word of conceptLower.split(/\s+/)) {
      const termExisting = this._byTerm.get(word) ?? [];
      if (!termExisting.includes(semantic.id)) {
        termExisting.push(semantic.id);
        this._byTerm.set(word, termExisting);
      }
    }
  }

  searchByTerm(term: string): readonly MemoryEntry[] {
    const ids = this._byTerm.get(term.toLowerCase()) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is MemoryEntry => e !== undefined),
    );
  }

  searchByConcept(concept: string): readonly string[] {
    return Object.freeze([...(this._byConcept.get(concept.toLowerCase()) ?? [])]);
  }

  getTopTerms(n: number): readonly SemanticIndexEntry[] {
    const entries: SemanticIndexEntry[] = [...this._byTerm.entries()]
      .map(([term, ids]) => ({
        term,
        entryIds: Object.freeze([...ids]),
        score: ids.length,
      }))
      .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
      .slice(0, n);
    return Object.freeze(entries);
  }

  clear(): void {
    this._byTerm.clear();
    this._byConcept.clear();
    this._entries.clear();
  }

  private _extractTerms(entry: MemoryEntry): string[] {
    const terms = new Set<string>();
    const text = `${entry.content} ${entry.category} ${entry.tags.join(' ')} ${Object.values(entry.metadata).join(' ')}`;
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    for (const word of words) terms.add(word);
    return [...terms];
  }
}
