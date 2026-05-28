import type { NodeId, Neighborhood } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';
import { BoundedTraverser } from '../traversal/bounded-traverser.ts';
import { generateId } from '../utils/index.ts';

export interface NeighborhoodOptions {
  radius?: number;
  maxNodes?: number;
  direction?: 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL';
  nodeTypes?: string[];
  edgeTypes?: string[];
  minDensity?: number;
}

export class NeighborhoodEngine {
  private graph: GraphContract;
  private bfsTraverser: BFSTraverser;
  private boundedTraverser: BoundedTraverser;

  constructor(graph: GraphContract) {
    this.graph = graph;
    this.bfsTraverser = new BFSTraverser(graph);
    this.boundedTraverser = new BoundedTraverser(graph);
  }

  public explore(nodeId: NodeId, options?: NeighborhoodOptions): Neighborhood {
    const radius = options?.radius ?? 2;
    const maxNodes = options?.maxNodes ?? 500;
    const direction = options?.direction ?? 'BIDIRECTIONAL';
    const nodeTypes = options?.nodeTypes;
    const edgeTypes = options?.edgeTypes;

    let nodeIds: NodeId[];

    if (maxNodes < 1000) {
      const traversalResult = this.boundedTraverser.traverse(nodeId, {
        maxDepth: radius,
        maxNodes,
        direction,
      });
      nodeIds = Array.from(traversalResult.visited);
    } else {
      const traversalResult = this.bfsTraverser.traverse(nodeId, {
        maxDepth: radius,
        maxNodes,
        direction,
      });
      nodeIds = Array.from(traversalResult.visited);
    }

    if (nodeTypes) {
      const typeSet = new Set(nodeTypes);
      nodeIds = nodeIds.filter((id) => {
        const node = this.graph.getNode(id);
        return node && typeSet.has(node.type);
      });
    }

    const edgeIds: string[] = [];
    const nodeIdSet = new Set(nodeIds);
    for (const id of nodeIds) {
      const edges = this.graph.getEdgesForNode(id);
      for (const edge of edges) {
        if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
        if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
          if (!edgeIds.includes(edge.id)) {
            edgeIds.push(edge.id);
          }
        }
      }
    }

    const maxPossibleEdges = (nodeIds.length * (nodeIds.length - 1)) / 2;
    const density = maxPossibleEdges > 0
      ? Math.round((edgeIds.length / maxPossibleEdges) * 10000) / 10000
      : 0;

    const fingerprint = generateId('nbhd');

    return {
      center: nodeId,
      nodes: nodeIds,
      edges: edgeIds,
      radius,
      nodeCount: nodeIds.length,
      edgeCount: edgeIds.length,
      density,
      fingerprint,
    };
  }

  public findNeighborhoods(options?: NeighborhoodOptions): Neighborhood[] {
    const allNodes = this.graph.getAllNodes();
    const neighborhoods: Neighborhood[] = [];
    const visited = new Set<NodeId>();
    const radius = options?.radius ?? 1;
    const maxNodes = options?.maxNodes ?? 200;
    const direction = options?.direction ?? 'BIDIRECTIONAL';

    for (const node of allNodes) {
      if (visited.has(node.id)) continue;

      if (options?.nodeTypes && !options.nodeTypes.includes(node.type)) continue;

      const neighborhood = this.explore(node.id, { radius, maxNodes, direction });
      const unvisitedNodes = neighborhood.nodes.filter((n) => !visited.has(n));

      if (options?.minDensity !== undefined && neighborhood.density < options.minDensity) continue;

      if (unvisitedNodes.length > 0) {
        for (const n of neighborhood.nodes) visited.add(n);
        neighborhoods.push(neighborhood);
      }
    }

    return neighborhoods;
  }

  public compareNeighborhoods(
    a: Neighborhood,
    b: Neighborhood,
  ): { overlaps: NodeId[]; uniqueA: NodeId[]; uniqueB: NodeId[] } {
    const setA = new Set(a.nodes);
    const setB = new Set(b.nodes);

    const overlaps: NodeId[] = [];
    const uniqueA: NodeId[] = [];
    const uniqueB: NodeId[] = [];

    for (const nodeId of a.nodes) {
      if (setB.has(nodeId)) {
        overlaps.push(nodeId);
      } else {
        uniqueA.push(nodeId);
      }
    }

    for (const nodeId of b.nodes) {
      if (!setA.has(nodeId)) {
        uniqueB.push(nodeId);
      }
    }

    return { overlaps, uniqueA, uniqueB };
  }
}
