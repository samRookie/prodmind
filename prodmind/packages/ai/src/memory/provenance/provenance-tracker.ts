import { createProvenanceRecord } from '../contracts/memory-factories.ts';
import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';

export class ProvenanceTracker {
  private readonly _records: Map<string, ProvenanceRecord> = new Map();
  private _store?: GraphMemoryStore;

  constructor(store?: GraphMemoryStore) {
    this._store = store;
  }

  get records(): readonly ProvenanceRecord[] {
    return Object.freeze(
      [...this._records.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  track(sourceId: string, sourceType: string, parentId?: string, fingerprint?: string, orchestrationId?: string, executionId?: string): ProvenanceRecord {
    const record = createProvenanceRecord({
      sourceId, sourceType: sourceType as never,
      fingerprint: fingerprint ?? '',
      parentId: parentId ?? '',
      orchestrationId: orchestrationId ?? '',
      executionId: executionId ?? '',
    });
    this._records.set(record.id, record);
    if (this._store) this._store.storeProvenance(record);
    return record;
  }

  getProvenance(id: string): ProvenanceRecord | undefined {
    return this._records.get(id);
  }

  getBySourceId(sourceId: string): readonly ProvenanceRecord[] {
    return Object.freeze(
      [...this._records.values()]
        .filter(r => r.sourceId === sourceId)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getBySourceType(sourceType: string): readonly ProvenanceRecord[] {
    return Object.freeze(
      [...this._records.values()]
        .filter(r => r.sourceType === sourceType)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getChain(provenanceId: string): readonly ProvenanceRecord[] {
    const chain: ProvenanceRecord[] = [];
    let current = this._records.get(provenanceId);
    while (current) {
      chain.push(current);
      current = current.parentId ? this._records.get(current.parentId) : undefined;
    }
    return Object.freeze(chain);
  }

  get count(): number {
    return this._records.size;
  }

  clear(): void {
    this._records.clear();
  }
}
