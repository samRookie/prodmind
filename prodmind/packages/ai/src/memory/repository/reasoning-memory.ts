import type { ReasoningMemory } from '../contracts/memory-contracts.ts';

export class ReasoningMemoryStore {
  private readonly _entries: Map<string, ReasoningMemory> = new Map();
  private readonly _byChainType: Map<string, string[]> = new Map();

  get count(): number {
    return this._entries.size;
  }

  store(entry: ReasoningMemory): void {
    this._entries.set(entry.id, entry);
    const existing = this._byChainType.get(entry.chainType) ?? [];
    existing.push(entry.id);
    this._byChainType.set(entry.chainType, existing);
  }

  get(id: string): ReasoningMemory | undefined {
    return this._entries.get(id);
  }

  getByChainType(chainType: string): readonly ReasoningMemory[] {
    const ids = this._byChainType.get(chainType) ?? [];
    return Object.freeze(
      ids.map(id => this._entries.get(id)).filter((e): e is ReasoningMemory => e !== undefined),
    );
  }

  getByEvidenceId(evidenceId: string): readonly ReasoningMemory[] {
    return Object.freeze(
      [...this._entries.values()]
        .filter(e => e.evidenceIds.includes(evidenceId))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getAll(): readonly ReasoningMemory[] {
    return Object.freeze(
      [...this._entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  clear(): void {
    this._entries.clear();
    this._byChainType.clear();
  }
}
