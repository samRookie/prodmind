import type { MemoryEntry } from '../contracts/memory-contracts.ts';
import { MemoryRepository } from '../repository/memory-repository.ts';
import { computeMemoryFingerprint } from '../hashing/memory-fingerprint.ts';

export class DeterministicRetrieval {
  private readonly _repository: MemoryRepository;

  constructor(repository: MemoryRepository) {
    this._repository = repository;
  }

  retrieveStable(entryIds: readonly string[]): MemoryEntry[] {
    const entries = this._repository.getEntries(entryIds);
    const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));

    return sorted;
  }

  retrieveByCategoryStable(category: string): readonly MemoryEntry[] {
    return this._repository.getEntriesByCategory(category);
  }

  deterministicSlice(entries: readonly MemoryEntry[], offset: number, limit: number): readonly MemoryEntry[] {
    const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
    return Object.freeze(sorted.slice(offset, offset + limit));
  }

  computeRetrievalFingerprint(entryIds: readonly string[]): string {
    const parts = this.retrieveStable(entryIds).map(e => `${e.id}:${e.fingerprint}`);
    return computeMemoryFingerprint(parts);
  }

  verifyDeterministic(expectedFingerprint: string, entryIds: readonly string[]): boolean {
    const actualFingerprint = this.computeRetrievalFingerprint(entryIds);
    return expectedFingerprint === actualFingerprint;
  }
}
