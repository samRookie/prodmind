import type { MemoryRecord } from '../contracts/memory-record.ts';
import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { GraphQuery, type QueryResult } from '../graph/graph-query.ts';
import { CrossNamespaceRetriever } from './cross-namespace-retriever.ts';

export enum RetrievalStage {
  SEED = 'seed',
  GRAPH_EXPAND = 'graph_expand',
  NAMESPACE = 'namespace',
  CROSS_NS = 'cross_ns',
  FILTER = 'filter',
  DEDUP = 'dedup',
  RANK = 'rank',
}

export interface RetrievalStep {
  readonly stage: RetrievalStage;
  readonly result: QueryResult;
}

export class RetrievalEngine {
  private readonly _store: GraphMemoryStore;
  private readonly _graphQuery: GraphQuery;
  private readonly _crossNs: CrossNamespaceRetriever;
  private _steps: RetrievalStep[] = [];

  constructor(store: GraphMemoryStore) {
    this._store = store;
    this._graphQuery = new GraphQuery();
    this._crossNs = new CrossNamespaceRetriever();
  }

  get steps(): readonly RetrievalStep[] {
    return Object.freeze([...this._steps]);
  }

  retrieve(query: RetrievalQuery): QueryResult {
    this._steps = [];

    /* Stage 1 — seed records / nodes */
    const seedResult = this._seed(query);
    this._steps.push({ stage: RetrievalStage.SEED, result: seedResult });

    /* Stage 2 — graph expansion */
    const graphResult = this._expandGraph(query, seedResult);
    this._steps.push({ stage: RetrievalStage.GRAPH_EXPAND, result: graphResult });

    /* Stage 3 — namespace lookup */
    const nsResult = this._namespaceLookup(query);
    this._steps.push({ stage: RetrievalStage.NAMESPACE, result: nsResult });

    /* Stage 4 — cross-namespace */
    const crossResult = this._crossNs.retrieve(this._store, query);
    this._steps.push({ stage: RetrievalStage.CROSS_NS, result: crossResult });

    /* Merge all intermediate results */
    const merged = this._mergeResults([seedResult, graphResult, nsResult, crossResult]);

    /* Stage 5 — filter */
    const filtered = this._applyFilters(merged, query);
    this._steps.push({ stage: RetrievalStage.FILTER, result: filtered });

    /* Stage 6 — deduplicate */
    const deduped = this._deduplicate(filtered);
    this._steps.push({ stage: RetrievalStage.DEDUP, result: deduped });

    /* Stage 7 — rank */
    const ranked = this._rank(deduped);
    this._steps.push({ stage: RetrievalStage.RANK, result: ranked });

    return ranked;
  }

  private _seed(query: RetrievalQuery): QueryResult {
    return this._graphQuery.query(this._store, query);
  }

  private _expandGraph(query: RetrievalQuery, seed: QueryResult): QueryResult {
    if (query.maxDepth === 0) return emptyResult();

    const allSeedIds = [
      ...seed.records.map(r => r.id),
      ...seed.nodes.map(n => n.id),
    ];

    return this._graphQuery.query(this._store, {
      ...query,
      seedIds: allSeedIds,
    } as RetrievalQuery);
  }

  private _namespaceLookup(query: RetrievalQuery): QueryResult {
    if (!query.namespace) return emptyResult();
    return this._graphQuery.queryByNamespace(this._store, query.namespace);
  }

  private _mergeResults(results: readonly QueryResult[]): QueryResult {
    const records = results.flatMap(r => r.records);
    const nodes = results.flatMap(r => r.nodes);
    return freezeResult(records, nodes);
  }

  private _applyFilters(result: QueryResult, query: RetrievalQuery): QueryResult {
    if (!query.filterCategories?.length) return result;

    const records = result.records.filter(r =>
      query.filterCategories!.includes(r.category as never),
    );
    return freezeResult(records, result.nodes);
  }

  private _deduplicate(result: QueryResult): QueryResult {
    const seenIds = new Set<string>();
    const records: MemoryRecord[] = [];
    const nodes: SemanticNode[] = [];

    for (const r of result.records) {
      if (!seenIds.has(r.id)) { seenIds.add(r.id); records.push(r); }
    }

    for (const n of result.nodes) {
      if (!seenIds.has(n.id)) { seenIds.add(n.id); nodes.push(n); }
    }

    return freezeResult(records, nodes);
  }

  private _rank(result: QueryResult): QueryResult {
    return freezeResult(
      [...result.records].sort((a, b) => a.id.localeCompare(b.id)),
      [...result.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
}

function emptyResult(): QueryResult {
  return Object.freeze({ records: Object.freeze([]), nodes: Object.freeze([]), total: 0 });
}

function freezeResult(records: readonly MemoryRecord[], nodes: readonly SemanticNode[]): QueryResult {
  return Object.freeze({
    records: Object.freeze([...records]),
    nodes: Object.freeze([...nodes]),
    total: records.length + nodes.length,
  });
}
