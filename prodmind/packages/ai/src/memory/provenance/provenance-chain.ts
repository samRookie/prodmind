import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import { ProvenanceTracker } from './provenance-tracker.ts';

export interface ChainLink {
  readonly record: ProvenanceRecord;
  readonly depth: number;
  readonly children: readonly ChainLink[];
}

export class ProvenanceChain {
  private readonly _tracker: ProvenanceTracker;

  constructor() {
    this._tracker = new ProvenanceTracker();
  }

  get tracker(): ProvenanceTracker {
    return this._tracker;
  }

  buildTree(sourceId: string, sourceType: string): ChainLink {
    const record = this._tracker.track(sourceId, sourceType);
    return { record, depth: 0, children: Object.freeze([]) };
  }

  addChild(parentId: string, sourceId: string, sourceType: string): ChainLink | undefined {
    const parent = this._tracker.getProvenance(parentId);
    if (!parent) return undefined;

    const record = this._tracker.track(sourceId, sourceType, parentId);
    return { record, depth: 1, children: Object.freeze([]) };
  }

  walk(provenanceId: string): readonly ChainLink[] {
    const chain = this._tracker.getChain(provenanceId);
    return Object.freeze(
      chain.map((r, i) => ({ record: r, depth: i, children: Object.freeze([]) })),
    );
  }

  toDag(rootId: string): ChainLink {
    const records = this._tracker.records;
    const children = new Map<string, ProvenanceRecord[]>();

    for (const r of records) {
      if (r.parentId) {
        const existing = children.get(r.parentId) ?? [];
        existing.push(r);
        children.set(r.parentId, existing);
      }
    }

    const build = (id: string, depth: number): ChainLink => {
      const record = this._tracker.getProvenance(id)!;
      const childLinks = (children.get(id) ?? []).map(c => build(c.id, depth + 1));
      return { record, depth, children: Object.freeze(childLinks) };
    };

    return build(rootId, 0);
  }
}
