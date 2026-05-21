import type { MemoryRecord } from '../contracts/memory-record.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';

export interface IndexEntry<TMeta = Record<string, unknown>> {
  readonly key: string;
  readonly refId: string;
  readonly metadata: TMeta;
}

export class SemanticIndex {
  private readonly _entries: Map<string, IndexEntry[]> = new Map();

  indexRecord(key: string, record: MemoryRecord): void {
    this.addEntry(key, { key, refId: record.id, metadata: { category: record.category } });
  }

  indexNode(key: string, node: SemanticNode): void {
    this.addEntry(key, { key, refId: node.id, metadata: { type: node.type, label: node.label } });
  }

  private addEntry(key: string, entry: IndexEntry): void {
    const existing = this._entries.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      this._entries.set(key, [entry]);
    }
  }

  lookup(key: string): readonly IndexEntry[] {
    const found = this._entries.get(key);
    return Object.freeze(found ? [...found].sort((a, b) => a.refId.localeCompare(b.refId)) : []);
  }

  remove(refId: string): number {
    let removed = 0;
    for (const [key, entries] of this._entries) {
      const before = entries.length;
      this._entries.set(key, entries.filter(e => e.refId !== refId));
      removed += before - this._entries.get(key)!.length;
    }
    return removed;
  }

  clear(): void {
    this._entries.clear();
  }

  get size(): number {
    let count = 0;
    for (const entries of this._entries.values()) {
      count += entries.length;
    }
    return count;
  }

  get keyCount(): number {
    return this._entries.size;
  }

  entries(): readonly IndexEntry[] {
    const all: IndexEntry[] = [];
    for (const entries of this._entries.values()) {
      all.push(...entries);
    }
    return Object.freeze(all);
  }
}
