import { createSemanticNode, createSemanticEdge } from '../contracts/memory-factories.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import type { SemanticEdge } from '../contracts/semantic-edge.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { GraphLinker } from '../graph/graph-linker.ts';
import { SemanticIndex } from '../indexing/semantic-index.ts';

export interface CodeGraphNode {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly tags?: readonly string[];
  readonly properties?: Record<string, unknown>;
}

export interface CodeGraphEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationship: string;
  readonly weight?: number;
}

export class GraphMemoryBridge {
  private readonly _linker: GraphLinker;
  private readonly _index: SemanticIndex;

  constructor() {
    this._linker = new GraphLinker();
    this._index = new SemanticIndex();
  }

  get linker(): GraphLinker {
    return this._linker;
  }

  get index(): SemanticIndex {
    return this._index;
  }

  importNodes(store: GraphMemoryStore, nodes: readonly CodeGraphNode[]): readonly SemanticNode[] {
    const created: SemanticNode[] = [];

    for (const input of nodes) {
      const node = createSemanticNode({
        id: input.id,
        type: input.type as never,
        label: input.label,
        tags: input.tags,
        properties: input.properties,
      });
      store.storeNode(node);
      this._index.indexNode(node.label, node);
      created.push(node);
    }

    return Object.freeze(created);
  }

  importEdges(store: GraphMemoryStore, edges: readonly CodeGraphEdge[]): readonly SemanticEdge[] {
    const created: SemanticEdge[] = [];

    for (const input of edges) {
      const edge = createSemanticEdge({
        sourceId: input.sourceId,
        targetId: input.targetId,
        relationship: input.relationship as never,
        weight: input.weight,
      });
      store.storeEdge(edge);
      created.push(edge);
    }

    return Object.freeze(created);
  }

  importGraph(store: GraphMemoryStore, nodes: readonly CodeGraphNode[], edges: readonly CodeGraphEdge[]): { nodes: readonly SemanticNode[]; edges: readonly SemanticEdge[] } {
    return Object.freeze({
      nodes: this.importNodes(store, nodes),
      edges: this.importEdges(store, edges),
    });
  }

  linkBySharedNamespace(store: GraphMemoryStore, namespace: string): readonly SemanticEdge[] {
    return this._linker.linkByNamespace(store, namespace);
  }
}
