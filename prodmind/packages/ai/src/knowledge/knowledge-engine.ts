import type { KnowledgeBuildInput, KnowledgeGraph, KnowledgeNode, KnowledgeRelation, KnowledgeTraversalResult, KnowledgeQuery, RelationType, KnowledgeNodeType } from './knowledge-types.ts';
import { KnowledgeGraphImpl } from './knowledge-graph.ts';
import { KnowledgeQueryEngine } from './knowledge-query.ts';

export class KnowledgeEngine {
  private graph = new KnowledgeGraphImpl();
  private queryEngine = new KnowledgeQueryEngine();

  build(input: KnowledgeBuildInput): void {
    this.graph.build(input);
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.graph.getNode(id);
  }

  getRelation(id: string): KnowledgeRelation | undefined {
    return this.graph.getRelation(id);
  }

  getNeighbors(nodeId: string) {
    return this.graph.getNeighbors(nodeId);
  }

  getOutgoingEdges(nodeId: string): KnowledgeRelation[] {
    return this.graph.getOutgoingEdges(nodeId);
  }

  getIncomingEdges(nodeId: string): KnowledgeRelation[] {
    return this.graph.getIncomingEdges(nodeId);
  }

  query(raw: KnowledgeQuery): KnowledgeTraversalResult[] {
    return this.queryEngine.query(this.graph, raw);
  }

  neighborhood(nodeId: string, radius?: number) {
    return this.queryEngine.neighborhood(this.graph, nodeId, radius);
  }

  search(term: string): KnowledgeNode[] {
    return this.queryEngine.search(this.graph, term);
  }

  rank(nodeIds: string[]) {
    return this.queryEngine.rank(this.graph, nodeIds);
  }

  getNodesByType(type: KnowledgeNodeType): KnowledgeNode[] {
    return this.graph.getNodesByType(type);
  }

  getRelationsByType(type: RelationType): KnowledgeRelation[] {
    return this.graph.getRelationsByType(type);
  }

  snapshot(): KnowledgeGraph {
    return this.graph.snapshot();
  }

  clear(): void {
    this.graph.clear();
  }

  get nodeCount(): number { return this.graph.nodeCount; }
  get relationCount(): number { return this.graph.relationCount; }
}
