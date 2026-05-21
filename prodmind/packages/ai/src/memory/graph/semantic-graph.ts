import type { SemanticEdge } from '../contracts/semantic-edge.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';

export interface NeighborResult {
  readonly node: SemanticNode;
  readonly edge: SemanticEdge;
  readonly depth: number;
}

export class SemanticGraph {
  private readonly _nodes: Map<string, SemanticNode>;
  private readonly _edges: SemanticEdge[];

  constructor(nodes?: readonly SemanticNode[], edges?: readonly SemanticEdge[]) {
    this._nodes = new Map();
    this._edges = [];
    if (nodes) for (const n of nodes) this._nodes.set(n.id, n);
    if (edges) this._edges.push(...edges);
  }

  get nodes(): readonly SemanticNode[] {
    return Object.freeze([...this._nodes.values()]);
  }

  get edges(): readonly SemanticEdge[] {
    return Object.freeze([...this._edges]);
  }

  getNode(id: string): SemanticNode | undefined {
    return this._nodes.get(id);
  }

  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  getNeighbors(nodeId: string, maxDepth = 10): readonly NeighborResult[] {
    if (!this._nodes.has(nodeId)) return Object.freeze([]);
    const visited = new Set<string>();
    const results: NeighborResult[] = [];
    const queue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      for (const edge of this._edges) {
        let neighborId: string | undefined;
        if (edge.sourceId === current.id) neighborId = edge.targetId;
        else if (edge.targetId === current.id) neighborId = edge.sourceId;

        if (neighborId && !visited.has(neighborId)) {
          visited.add(neighborId);
          const node = this._nodes.get(neighborId);
          if (node) {
            const nextDepth = current.depth + 1;
            results.push({ node, edge, depth: nextDepth });
            queue.push({ id: neighborId, depth: nextDepth });
          }
        }
      }
    }

    results.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.node.id.localeCompare(b.node.id);
    });

    return Object.freeze(results);
  }

  getOutgoing(nodeId: string): readonly SemanticEdge[] {
    const result = this._edges
      .filter(e => e.sourceId === nodeId)
      .sort((a, b) => a.targetId.localeCompare(b.targetId));
    return Object.freeze(result);
  }

  getIncoming(nodeId: string): readonly SemanticEdge[] {
    const result = this._edges
      .filter(e => e.targetId === nodeId)
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
    return Object.freeze(result);
  }

  nodeCount(): number {
    return this._nodes.size;
  }

  edgeCount(): number {
    return this._edges.length;
  }

  addNode(node: SemanticNode): void {
    if (!this._nodes.has(node.id)) {
      this._nodes.set(node.id, node);
    }
  }

  addEdge(edge: SemanticEdge): void {
    this._edges.push(edge);
  }
}
