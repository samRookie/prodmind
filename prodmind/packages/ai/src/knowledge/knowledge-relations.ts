import type { KnowledgeRelation, RelationType } from './knowledge-types.ts';
import type { KnowledgeGraphImpl } from './knowledge-graph.ts';

export function findRelationsBetween(
  graph: KnowledgeGraphImpl,
  sourceId: string,
  targetId: string,
): KnowledgeRelation[] {
  const results: KnowledgeRelation[] = [];
  for (const rel of graph.getOutgoingEdges(sourceId)) {
    if (rel.targetId === targetId) results.push(rel);
  }
  return results.sort((a, b) => a.relationType.localeCompare(b.relationType));
}

export function findRelationsByType(
  graph: KnowledgeGraphImpl,
  relationType: RelationType,
): KnowledgeRelation[] {
  return graph.getRelationsByType(relationType);
}

export function findNodeRelations(
  graph: KnowledgeGraphImpl,
  nodeId: string,
): { outgoing: KnowledgeRelation[]; incoming: KnowledgeRelation[] } {
  return {
    outgoing: graph.getOutgoingEdges(nodeId),
    incoming: graph.getIncomingEdges(nodeId),
  };
}
