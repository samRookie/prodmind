import type { KnowledgeNode, KnowledgeQuery, KnowledgeTraversalResult } from './knowledge-types.ts';
import type { KnowledgeGraphImpl } from './knowledge-graph.ts';
import { traverseGraph, findNeighborhood } from './knowledge-traversal.ts';
import { normalizeKnowledgeQuery } from './knowledge-normalizer.ts';
import { rankKnowledgeNodes } from './knowledge-ranking.ts';

export class KnowledgeQueryEngine {
  query(graph: KnowledgeGraphImpl, raw: KnowledgeQuery): KnowledgeTraversalResult[] {
    const query = normalizeKnowledgeQuery(raw);
    return traverseGraph(graph, query.sourceIds ?? [], {
      maxDepth: query.maxDepth,
      maxNodes: query.maxNodes,
      relationTypes: query.relationTypes,
      targetTypes: query.targetTypes,
    });
  }

  neighborhood(graph: KnowledgeGraphImpl, nodeId: string, radius?: number) {
    return findNeighborhood(graph, nodeId, radius);
  }

  search(graph: KnowledgeGraphImpl, term: string): KnowledgeNode[] {
    const lowerTerm = term.toLowerCase();
    return [...graph.getNodesByType('NODE'), ...graph.getNodesByType('HOTSPOT'), ...graph.getNodesByType('RISK')]
      .filter(n => n.label.toLowerCase().includes(lowerTerm) || n.description.toLowerCase().includes(lowerTerm))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  rank(graph: KnowledgeGraphImpl, nodeIds: string[]) {
    const nodes = nodeIds.map(id => graph.getNode(id)).filter((n): n is KnowledgeNode => !!n);
    const allRelations = [...graph.getRelationsByType('DEPENDS_ON'), ...graph.getRelationsByType('PROPAGATES_TO'), ...graph.getRelationsByType('IMPACTS')];
    return rankKnowledgeNodes(nodes, allRelations);
  }
}
