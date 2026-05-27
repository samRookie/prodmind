import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import type { ProvenanceTracker } from './provenance-tracker.ts';

export interface LinkChain {
  readonly head: ProvenanceRecord;
  readonly tail: ProvenanceRecord;
  readonly length: number;
  readonly ids: readonly string[];
}

export class ProvenanceLinker {
  private readonly _tracker: ProvenanceTracker;
  private readonly _links: Map<string, string[]> = new Map();

  constructor(tracker: ProvenanceTracker) {
    this._tracker = tracker;
  }

  link(sourceId: string, targetId: string, sourceType: string): ProvenanceRecord {
    const record = this._tracker.track(sourceId, sourceType, targetId);

    const existing = this._links.get(targetId) ?? [];
    existing.push(record.id);
    this._links.set(targetId, existing);

    return record;
  }

  linkChain(sourceIds: readonly string[], sourceType: string): LinkChain | undefined {
    if (sourceIds.length < 2) return undefined;

    let head: ProvenanceRecord | undefined;
    let tail: ProvenanceRecord | undefined;
    const ids: string[] = [];

    for (let i = 0; i < sourceIds.length; i++) {
      const parentId = i > 0 ? ids[i - 1] : undefined;
      const record = parentId
        ? this._tracker.track(sourceIds[i]!, sourceType, parentId)
        : this._tracker.track(sourceIds[i]!, sourceType);

      ids.push(record.id);
      if (i === 0) head = record;
      tail = record;
    }

    if (!head || !tail) return undefined;

    return Object.freeze({ head, tail, length: sourceIds.length, ids: Object.freeze(ids) });
  }

  linkDag(entries: readonly { sourceId: string; parentId?: string; sourceType: string }[]): readonly ProvenanceRecord[] {
    const records: ProvenanceRecord[] = [];

    for (const entry of entries) {
      const record = entry.parentId
        ? this._tracker.track(entry.sourceId, entry.sourceType, entry.parentId)
        : this._tracker.track(entry.sourceId, entry.sourceType);
      records.push(record);
    }

    return Object.freeze(records);
  }

  getLinks(provenanceId: string): readonly string[] {
    return Object.freeze([...(this._links.get(provenanceId) ?? [])]);
  }

  clear(): void {
    this._links.clear();
  }
}
