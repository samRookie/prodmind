import type { KnowledgeBuildInput, KnowledgeQuery } from './knowledge-types.ts';

export function normalizeKnowledgeBuildInput(input: KnowledgeBuildInput): KnowledgeBuildInput {
  return {
    nodes: input.nodes ? [...input.nodes].sort((a, b) => a.id.localeCompare(b.id)).map(n => ({
      ...n, metadata: { ...n.metadata },
    })) : undefined,
    relations: input.relations ? [...input.relations].sort((a, b) => `${a.sourceId}:${a.targetId}`.localeCompare(`${b.sourceId}:${b.targetId}`)).map(r => ({
      ...r, weight: r.weight ?? 1, metadata: { ...r.metadata },
    })) : undefined,
  };
}

export function normalizeKnowledgeQuery(query: KnowledgeQuery): KnowledgeQuery {
  return {
    sourceIds: query.sourceIds ? [...new Set(query.sourceIds)].sort() : undefined,
    relationTypes: query.relationTypes ? [...query.relationTypes] : undefined,
    targetTypes: query.targetTypes ? [...query.targetTypes] : undefined,
    maxDepth: Math.min(Math.max(1, query.maxDepth), 10),
    maxNodes: Math.min(Math.max(1, query.maxNodes), 100),
  };
}
