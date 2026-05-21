import type { MemoryRecord } from '../contracts/memory-record.ts';
import { SemanticIndex } from './semantic-index.ts';

export class TokenIndex {
  private readonly _index: SemanticIndex;

  constructor() {
    this._index = new SemanticIndex();
  }

  indexRecord(record: MemoryRecord, tokens: readonly string[]): void {
    for (const token of tokens) {
      this._index.indexRecord(token, record);
    }
  }

  lookup(token: string) {
    return this._index.lookup(token);
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
}
