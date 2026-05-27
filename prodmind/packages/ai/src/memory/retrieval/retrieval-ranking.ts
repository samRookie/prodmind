import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { QueryResult } from '../graph/graph-query.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';

export interface RankingFactors {
  readonly dependencyProximity: number;
  readonly executionLineage: number;
  readonly namespaceLocality: number;
  readonly semanticSimilarity: number;
  readonly orchestrationRelevance: number;
}

export interface RankedEntry {
  readonly refId: string;
  readonly score: number;
  readonly factors: RankingFactors;
}

interface RankWeights {
  readonly dependencyProximity: number;
  readonly executionLineage: number;
  readonly namespaceLocality: number;
  readonly semanticSimilarity: number;
  readonly orchestrationRelevance: number;
}

const DEFAULT_WEIGHTS: RankWeights = Object.freeze({
  dependencyProximity: 0.30,
  executionLineage: 0.25,
  namespaceLocality: 0.20,
  semanticSimilarity: 0.15,
  orchestrationRelevance: 0.10,
});

export function rankResults(
  result: QueryResult,
  query: RetrievalQuery,
  store: GraphMemoryStore,
  weights: RankWeights = DEFAULT_WEIGHTS,
): QueryResult {
  const scored = scoreAll(result, query, store, weights);
  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.refId.localeCompare(b.refId);
  });

  const rankedIds = new Set(sorted.map(e => e.refId));
  const records = [...result.records].filter(r => rankedIds.has(r.id));
  const nodes = [...result.nodes].filter(n => rankedIds.has(n.id));
  const seen = new Set<string>();

  return Object.freeze({
    records: Object.freeze([...records].filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }).sort((a, b) => a.id.localeCompare(b.id))),
    nodes: Object.freeze([...nodes].filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; }).sort((a, b) => a.id.localeCompare(b.id))),
    total: records.length + nodes.length,
  });
}

export function scoreAll(
  result: QueryResult,
  query: RetrievalQuery,
  store: GraphMemoryStore,
  weights: RankWeights = DEFAULT_WEIGHTS,
): readonly RankedEntry[] {
  const entries: RankedEntry[] = [];
  const allIds = [
    ...result.records.map(r => r.id),
    ...result.nodes.map(n => n.id),
  ];

  const graph = store.toGraph();
  const seedSet = new Set(query.seedIds);
  const namespace = query.namespace ?? '';

  for (const id of allIds) {
    const factors = computeFactors(id, query, graph, seedSet, namespace, store);
    const score = (
      factors.dependencyProximity * weights.dependencyProximity +
      factors.executionLineage * weights.executionLineage +
      factors.namespaceLocality * weights.namespaceLocality +
      factors.semanticSimilarity * weights.semanticSimilarity +
      factors.orchestrationRelevance * weights.orchestrationRelevance
    );
    entries.push({ refId: id, score, factors });
  }

  return Object.freeze(
    [...entries].sort((a, b) => b.score - a.score || a.refId.localeCompare(b.refId)),
  );
}

function computeFactors(
  id: string,
  query: RetrievalQuery,
  graph: ReturnType<GraphMemoryStore['toGraph']>,
  seedSet: Set<string>,
  namespace: string,
  store: GraphMemoryStore,
): RankingFactors {
  const neighbors = graph.getNeighbors(id, 5);
  const seedDepths = neighbors
    .filter(n => seedSet.has(n.node.id))
    .map(n => n.depth);

  const dependencyProximity = seedDepths.length > 0
    ? 1 / (1 + Math.min(...seedDepths))
    : 0;

  const record = store.getRecord(id);
  const node = store.getNode(id);
  const provId = record?.provenanceId ?? '';
  const fingerprints = node?.fingerprints ?? [];

  const executionLineage = query.seedIds.some(sid => {
    const sr = store.getRecord(sid);
    return sr?.provenanceId === provId || fingerprints.includes(sr?.provenanceId ?? '');
  }) ? 0.8 : 0;

  let namespaceLocality = 0;
  if (namespace) {
    const matches = [id, record?.category ?? '', node?.type ?? '']
      .filter(v => v.includes(namespace) || namespace.includes(v));
    namespaceLocality = matches.length > 0 ? 0.5 * matches.length : 0;
  }

  let semanticSimilarity = 0;
  if (query.queryTerms?.length) {
    const haystack = JSON.stringify(record?.payload ?? node?.properties ?? '').toLowerCase();
    const matches = query.queryTerms.filter(t => haystack.includes(t.toLowerCase()));
    semanticSimilarity = matches.length / query.queryTerms.length;
  }

  const orchestrationRelevance = record?.category === 'orchestration' ? 1.0
    : record?.category === 'execution' ? 0.8
    : node?.type === 'workflow' || node?.type === 'execution' ? 0.7
    : 0.2;

  return Object.freeze({
    dependencyProximity,
    executionLineage,
    namespaceLocality,
    semanticSimilarity,
    orchestrationRelevance,
  });
}
