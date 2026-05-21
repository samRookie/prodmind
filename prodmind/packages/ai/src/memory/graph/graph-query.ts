import type { MemoryRecord } from '../contracts/memory-record.ts';
import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import type { GraphMemoryStore } from './graph-memory-store.ts';

export interface QueryResult {
  readonly records: readonly MemoryRecord[];
  readonly nodes: readonly SemanticNode[];
  readonly total: number;
}

export class GraphQuery {
  queryByNamespace(store: GraphMemoryStore, namespace: string): QueryResult {
    const records = store.records.filter(r => r.id.startsWith(namespace));
    const nodes = store.nodes.filter(n => n.id.startsWith(namespace));
    return freezeResult(records, nodes);
  }

  queryByProvenance(store: GraphMemoryStore, provenanceId: string): QueryResult {
    const records = store.records.filter(r => r.provenanceId === provenanceId);
    const nodes = store.nodes.filter(n => n.fingerprints.includes(provenanceId));
    return freezeResult(records, nodes);
  }

  queryByCategory(store: GraphMemoryStore, category: string): QueryResult {
    return freezeResult(
      store.getRecordsByCategory(category),
      [],
    );
  }

  queryByType(store: GraphMemoryStore, type: string): QueryResult {
    return freezeResult(
      [],
      store.getNodesByType(type),
    );
  }

  query(store: GraphMemoryStore, query: RetrievalQuery): QueryResult {
    const graph = store.toGraph();
    const seenRecords = new Set<string>();
    const seenNodes = new Set<string>();
    const records: MemoryRecord[] = [];
    const nodes: SemanticNode[] = [];

    for (const seedId of query.seedIds) {
      const record = store.getRecord(seedId);
      if (record && !seenRecords.has(record.id)) {
        seenRecords.add(record.id);
        records.push(record);
      }

      const node = store.getNode(seedId);
      if (node && !seenNodes.has(node.id)) {
        seenNodes.add(node.id);
        nodes.push(node);
      }

      if (query.maxDepth > 0) {
        const neighbors = graph.getNeighbors(seedId, query.maxDepth);
        for (const neighbor of neighbors) {
          if (!seenNodes.has(neighbor.node.id)) {
            seenNodes.add(neighbor.node.id);
            nodes.push(neighbor.node);
          }
          const nr = store.getRecord(neighbor.node.id);
          if (nr && !seenRecords.has(nr.id)) {
            seenRecords.add(nr.id);
            records.push(nr);
          }
        }
      }
    }

    const filtered = this.applyFilters({ records, nodes, total: 0 }, query);
    const total = filtered.records.length + filtered.nodes.length;

    if (filtered.records.length > query.maxResults) {
      return Object.freeze({
        records: Object.freeze(filtered.records.slice(0, query.maxResults)),
        nodes: Object.freeze(filtered.nodes.slice(0, query.maxResults)),
        total: query.maxResults,
      });
    }

    return freezeResult(filtered.records, filtered.nodes, total);
  }

  private applyFilters(result: QueryResult, query: RetrievalQuery): QueryResult {
    if (!query.filterCategories || query.filterCategories.length === 0) return result;

    const records = result.records.filter(r =>
      query.filterCategories!.includes(r.category as never),
    );

    return { records, nodes: result.nodes, total: 0 };
  }
}

function freezeResult(records: readonly MemoryRecord[], nodes: readonly SemanticNode[], totalOverride?: number): QueryResult {
  return Object.freeze({
    records: Object.freeze([...records].sort((a, b) => a.id.localeCompare(b.id))),
    nodes: Object.freeze([...nodes].sort((a, b) => a.id.localeCompare(b.id))),
    total: totalOverride ?? records.length + nodes.length,
  });
}
