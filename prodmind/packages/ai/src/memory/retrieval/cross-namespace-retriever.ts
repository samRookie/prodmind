import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import type { QueryResult } from '../graph/graph-query.ts';

export class CrossNamespaceRetriever {
  retrieve(store: GraphMemoryStore, query: RetrievalQuery): QueryResult {
    if (!query.queryTerms?.length) return emptyResult();

    const allRecords = store.records;
    const matching = allRecords.filter(r =>
      query.queryTerms!.some(term =>
        r.id.includes(term) ||
        r.category.includes(term) ||
        JSON.stringify(r.payload).includes(term) ||
        JSON.stringify(r.metadata).includes(term),
      ),
    );

    return Object.freeze({
      records: Object.freeze([...matching].sort((a, b) => a.id.localeCompare(b.id))),
      nodes: Object.freeze([]),
      total: matching.length,
    });
  }
}

function emptyResult(): QueryResult {
  return Object.freeze({ records: Object.freeze([]), nodes: Object.freeze([]), total: 0 });
}
