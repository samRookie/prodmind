import type { ContextWindow } from '../contracts/context-window.ts';
import type { MemorySnapshot } from '../contracts/memory-snapshot.ts';
import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import type { QueryResult } from '../graph/graph-query.ts';
import { RetrievalEngine } from '../retrieval/retrieval-engine.ts';
import { ContextAssembler } from '../retrieval/context-assembler.ts';
import type { AssemblyOptions } from '../retrieval/context-assembler.ts';

export class SemanticRehydration {
  private readonly _assembler: ContextAssembler;

  constructor() {
    this._assembler = new ContextAssembler();
  }

  rehydrateFromSnapshot(snapshot: MemorySnapshot, store: GraphMemoryStore): void {
    store.restoreSnapshot(snapshot);
  }

  reconstructRetrievalContext(store: GraphMemoryStore, query: RetrievalQuery): QueryResult {
    const engine = new RetrievalEngine(store);
    return engine.retrieve(query);
  }

  rehydrateContextWindow(store: GraphMemoryStore, query: RetrievalQuery, options: AssemblyOptions): ContextWindow {
    const result = this.reconstructRetrievalContext(store, query);
    return this._assembler.assemble(result, options);
  }

  restoreLineage(store: GraphMemoryStore, provenanceIds: readonly string[]): readonly ProvenanceRecord[] {
    return Object.freeze(
      provenanceIds
        .map(id => store.getProvenance(id))
        .filter((p): p is ProvenanceRecord => p !== undefined)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  reconstructSemanticState(store: GraphMemoryStore): {
    readonly recordCount: number;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly provenanceCount: number;
  } {
    return Object.freeze({
      recordCount: store.recordCount(),
      nodeCount: store.nodeCount(),
      edgeCount: store.edgeCount(),
      provenanceCount: store.provenances.length,
    });
  }
}
