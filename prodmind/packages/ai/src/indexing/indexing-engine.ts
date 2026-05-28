import type { CognitionIndex, IndexBuildInput, IndexType } from './indexing-types.ts';
import { IndexBuilder } from './index-builder.ts';

export class IndexingEngine {
  private builder = new IndexBuilder();
  private indexes = new Map<IndexType, CognitionIndex>();

  build(input: IndexBuildInput): void {
    this.indexes = this.builder.buildAll(input);
  }

  getIndex(indexType: IndexType): CognitionIndex | undefined {
    return this.indexes.get(indexType);
  }

  getAllIndexes(): Map<IndexType, CognitionIndex> {
    return new Map(this.indexes);
  }

  clear(): void {
    this.indexes.clear();
  }

  get size(): number {
    return this.indexes.size;
  }
}
