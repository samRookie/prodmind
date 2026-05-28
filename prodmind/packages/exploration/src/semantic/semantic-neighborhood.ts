import type { NodeId, Neighborhood } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';
import { generateFingerprint } from '../utils/index.ts';

export class SemanticNeighborhood {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public explore(nodeId: NodeId, radius: number, typeFilter?: string): Neighborhood {
    const node = this.graph.getNode(nodeId);
    if (!node) {
      return {
        center: nodeId,
        nodes: [],
        edges: [],
        radius,
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        fingerprint: generateFingerprint([nodeId, String(radius)]),
      };
    }

    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(nodeId, { maxDepth: radius });

    let nodeIds = Array.from(result.visited);
    if (typeFilter) {
      nodeIds = nodeIds.filter((id) => {
        const n = this.graph.getNode(id);
        return n && n.type === typeFilter;
      });
    }

    const edgeIds: string[] = [];
    const edgeSet = new Set<string>();
    for (const nodeId of nodeIds) {
      const edges = this.graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target) && !edgeSet.has(edge.id)) {
          edgeSet.add(edge.id);
          edgeIds.push(edge.id);
        }
      }
    }

    const nodeCount = nodeIds.length;
    const edgeCount = edgeIds.length;
    const maxPossible = nodeCount * (nodeCount - 1);
    const density = maxPossible > 0 ? edgeCount / maxPossible : 0;

    return {
      center: nodeId,
      nodes: nodeIds,
      edges: edgeIds,
      radius,
      nodeCount,
      edgeCount,
      density,
      fingerprint: generateFingerprint([nodeId, String(radius), ...nodeIds]),
    };
  }

  public findSemanticProximity(nodeId: NodeId, types: string[], maxDistance: number): NodeId[] {
    const targetTypes = new Set(types);
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(nodeId, { maxDepth: maxDistance });
    return Array.from(result.visited).filter((id) => {
      const node = this.graph.getNode(id);
      return node && targetTypes.has(node.type);
    });
  }

  public computeDensity(nodes: NodeId[], _radius: number): number {
    if (nodes.length <= 1) return 0;
    const nodeSet = new Set(nodes);
    let internalEdges = 0;
    for (const nodeId of nodes) {
      const edges = this.graph.getEdgesForNode(nodeId);
      for (const edge of edges) {
        if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
          internalEdges++;
        }
      }
    }
    const possible = nodes.length * (nodes.length - 1);
    return possible > 0 ? internalEdges / possible : 0;
  }
}
