import { createSemanticEdge } from '../contracts/memory-factories.ts';
import type { EdgeRelationship, SemanticEdge } from '../contracts/semantic-edge.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import type { GraphMemoryStore } from './graph-memory-store.ts';

export class GraphLinker {
  linkBySharedProvenance(store: GraphMemoryStore, nodeIds: readonly string[], provenanceRef: string): readonly SemanticEdge[] {
    const edges: SemanticEdge[] = [];
    const sorted = [...nodeIds].sort();

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        edges.push(createSemanticEdge({
          sourceId: sorted[i]!, targetId: sorted[j]!,
          relationship: 'provenance_of',
          weight: 1,
          provenanceRef,
        }));
      }
    }

    for (const edge of edges) store.storeEdge(edge);
    return Object.freeze(edges);
  }

  linkByNamespace(store: GraphMemoryStore, namespace: string, relationship: EdgeRelationship = 'contains'): readonly SemanticEdge[] {
    const nodes = [...store.nodes].filter(n =>
      n.id.startsWith(namespace) || n.tags.some(t => t.startsWith(namespace)),
    );
    const edges: SemanticEdge[] = [];
    const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

    for (let i = 1; i < sorted.length; i++) {
      edges.push(createSemanticEdge({
        sourceId: sorted[0]!.id, targetId: sorted[i]!.id,
        relationship,
        weight: 1,
      }));
    }

    for (const edge of edges) store.storeEdge(edge);
    return Object.freeze(edges);
  }

  linkExplicit(store: GraphMemoryStore, sourceId: string, targetId: string, relationship: EdgeRelationship, weight = 1): SemanticEdge {
    const edge = createSemanticEdge({ sourceId, targetId, relationship, weight });
    store.storeEdge(edge);
    return edge;
  }

  linkNodes(store: GraphMemoryStore, source: SemanticNode, target: SemanticNode, relationship: EdgeRelationship): SemanticEdge {
    return this.linkExplicit(store, source.id, target.id, relationship);
  }
}
