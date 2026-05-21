import type { MemoryRecord } from '../contracts/memory-record.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import { SemanticIndex } from './semantic-index.ts';

export class NamespaceIndex {
  private readonly _index: SemanticIndex;

  constructor() {
    this._index = new SemanticIndex();
  }

  indexRecord(record: MemoryRecord & { id: string }): void {
    const namespace = this.extractNamespace(record.id);
    if (namespace) {
      this._index.indexRecord(namespace, record);
    }
  }

  indexNode(node: SemanticNode & { id: string }): void {
    const namespace = this.extractNamespace(node.id);
    if (namespace) {
      this._index.indexNode(namespace, node);
    }
  }

  lookup(namespace: string) {
    return this._index.lookup(namespace);
  }

  remove(refId: string): number {
    return this._index.remove(refId);
  }

  clear(): void {
    this._index.clear();
  }

  get size(): number {
    return this._index.size;
  }

  private extractNamespace(id: string): string {
    const idx = id.indexOf(':');
    return idx >= 0 ? id.slice(0, idx) : '';
  }
}
