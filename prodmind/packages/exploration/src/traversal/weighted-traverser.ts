import { GraphTraverser } from './graph-traverser.ts';
import type { NodeId, TraversalResult, TraversalStrategy, GraphEdge } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalContext } from './traversal-context.ts';
import { BoundedTraversalExceededError } from '../errors/index.ts';

interface PriorityEntry {
  nodeId: NodeId;
  depth: number;
  parentId: NodeId | null;
  edgeId: string | null;
  weight: number;
}

export class WeightedTraverser extends GraphTraverser {
  public readonly strategy = 'WEIGHTED' as TraversalStrategy;

  constructor(graph: GraphContract) {
    super(graph);
  }

  public traverse(startNode: NodeId, options?: Record<string, unknown>): TraversalResult {
    const direction = (options?.direction as 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL') ?? 'FORWARD';
    const maxDepth = (options?.maxDepth as number) ?? 100;
    const maxNodes = (options?.maxNodes as number) ?? 10_000;
    const timeout = (options?.timeout as number) ?? 30_000;
    const ascending = (options?.ascending as boolean) ?? true;

    const context = new TraversalContext({
      startNode,
      strategy: this.strategy,
      maxDepth,
      maxNodes,
      timeout,
      direction,
    });

    this.context = context;
    const startTime = Date.now();

    const heap: PriorityEntry[] = [
      { nodeId: startNode, depth: 0, parentId: null, edgeId: null, weight: 0 },
    ];

    context.markVisited(startNode);
    context.addStep({
      nodeId: startNode,
      depth: 0,
      parentId: null,
      edgeId: null,
      metadata: { weight: 0 },
    });

    while (heap.length > 0 && context.shouldContinue()) {
      const current = heap.shift()!;
      context.depth = current.depth;

      if (context.visited.size >= maxNodes) {
        throw new BoundedTraversalExceededError(maxNodes, { strategy: this.strategy });
      }

      if (current.depth >= maxDepth) continue;

      const edges = this.getWeightedEdges(current.nodeId, direction);
      edges.sort((a, b) => (ascending ? a.weight - b.weight : b.weight - a.weight));

      for (const edge of edges) {
        if (!context.shouldContinue()) break;

        const neighborId = edge.target === current.nodeId ? edge.source : edge.target;
        if (context.isVisited(neighborId)) continue;

        context.markVisited(neighborId);

        const step = {
          nodeId: neighborId,
          depth: current.depth + 1,
          parentId: current.nodeId,
          edgeId: edge.id,
          metadata: { weight: edge.weight },
        };

        context.addStep(step);
        this.insertSorted(heap, {
          nodeId: neighborId,
          depth: current.depth + 1,
          parentId: current.nodeId,
          edgeId: edge.id,
          weight: current.weight + edge.weight,
        }, ascending);
      }
    }

    const status = context.cancelled ? 'CANCELLED' : 'COMPLETED';
    return this.buildResult(context.steps, context.visited, context.depth, startTime, status);
  }

  private getWeightedEdges(nodeId: NodeId, direction: string): GraphEdge[] {
    switch (direction) {
      case 'REVERSE':
        return this.graph.getIncomingEdges(nodeId);
      case 'BIDIRECTIONAL': {
        const out = this.graph.getOutgoingEdges(nodeId);
        const inc = this.graph.getIncomingEdges(nodeId);
        return [...out, ...inc];
      }
      case 'FORWARD':
      default:
        return this.graph.getOutgoingEdges(nodeId);
    }
  }

  private insertSorted(heap: PriorityEntry[], entry: PriorityEntry, ascending: boolean): void {
    let low = 0;
    let high = heap.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const cmp = ascending
        ? heap[mid]!.weight - entry.weight
        : entry.weight - heap[mid]!.weight;
      if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    heap.splice(low, 0, entry);
  }
}
