import type { KnowledgeGraph, KnowledgeNode, KnowledgeRelation, KnowledgeBuildInput, KnowledgeNodeType, RelationType } from './knowledge-types.ts';
import { fingerprintKnowledgeGraph } from './knowledge-fingerprint.ts';
import { normalizeKnowledgeBuildInput } from './knowledge-normalizer.ts';
import { createKnowledgeNode } from './knowledge-nodes.ts';
import { createKnowledgeRelation } from './knowledge-edges.ts';

export class KnowledgeGraphImpl {
  private nodes = new Map<string, KnowledgeNode>();
  private relations = new Map<string, KnowledgeRelation>();
  private outEdges = new Map<string, KnowledgeRelation[]>();
  private inEdges = new Map<string, KnowledgeRelation[]>();

  build(input: KnowledgeBuildInput): void {
    this.nodes.clear();
    this.relations.clear();
    this.outEdges.clear();
    this.inEdges.clear();

    const normalized = normalizeKnowledgeBuildInput(input);

    for (const n of normalized.nodes ?? []) {
      const node = createKnowledgeNode(n);
      this.nodes.set(node.id, node);
    }

    for (const r of normalized.relations ?? []) {
      const rel = createKnowledgeRelation(r);
      this.relations.set(rel.id, rel);

      if (!this.outEdges.has(rel.sourceId)) this.outEdges.set(rel.sourceId, []);
      this.outEdges.get(rel.sourceId)!.push(rel);

      if (!this.inEdges.has(rel.targetId)) this.inEdges.set(rel.targetId, []);
      this.inEdges.get(rel.targetId)!.push(rel);
    }
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getRelation(id: string): KnowledgeRelation | undefined {
    return this.relations.get(id);
  }

  getOutgoingEdges(nodeId: string): KnowledgeRelation[] {
    return [...(this.outEdges.get(nodeId) ?? [])].sort((a, b) => a.relationType.localeCompare(b.relationType));
  }

  getIncomingEdges(nodeId: string): KnowledgeRelation[] {
    return [...(this.inEdges.get(nodeId) ?? [])].sort((a, b) => a.relationType.localeCompare(b.relationType));
  }

  getNeighbors(nodeId: string): { node: KnowledgeNode; relation: KnowledgeRelation; direction: 'out' | 'in' }[] {
    const neighbors: { node: KnowledgeNode; relation: KnowledgeRelation; direction: 'out' | 'in' }[] = [];
    for (const rel of this.getOutgoingEdges(nodeId)) {
      const target = this.nodes.get(rel.targetId);
      if (target) neighbors.push({ node: target, relation: rel, direction: 'out' });
    }
    for (const rel of this.getIncomingEdges(nodeId)) {
      const source = this.nodes.get(rel.sourceId);
      if (source) neighbors.push({ node: source, relation: rel, direction: 'in' });
    }
    return neighbors.sort((a, b) => a.node.id.localeCompare(b.node.id));
  }

  getNodesByType(type: KnowledgeNodeType): KnowledgeNode[] {
    return [...this.nodes.values()].filter(n => n.type === type).sort((a, b) => a.id.localeCompare(b.id));
  }

  getRelationsByType(type: RelationType): KnowledgeRelation[] {
    return [...this.relations.values()].filter(r => r.relationType === type).sort((a, b) => a.id.localeCompare(b.id));
  }

  snapshot(): KnowledgeGraph {
    return {
      nodes: new Map(this.nodes),
      relations: new Map(this.relations),
      fingerprint: fingerprintKnowledgeGraph({
        nodes: this.nodes, relations: this.relations,
        fingerprint: '', builtAt: '',
      }),
      builtAt: new Date().toISOString(),
    };
  }

  clear(): void {
    this.nodes.clear();
    this.relations.clear();
    this.outEdges.clear();
    this.inEdges.clear();
  }

  get nodeCount(): number { return this.nodes.size; }
  get relationCount(): number { return this.relations.size; }
}
