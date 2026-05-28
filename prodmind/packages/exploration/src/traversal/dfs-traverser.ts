import { GraphTraverser } from './graph-traverser.ts';
import type { NodeId, TraversalResult, TraversalStrategy, TraversalStep } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalContext } from './traversal-context.ts';
import { TraversalOrdering } from './traversal-ordering.ts';
import type { OrderingStrategy } from './traversal-ordering.ts';
import { BoundedTraversalExceededError } from '../errors/index.ts';

export class DFSTraverser extends GraphTraverser {
  public readonly strategy = 'DFS' as TraversalStrategy;

  constructor(graph: GraphContract) {
    super(graph);
  }

  public traverse(startNode: NodeId, options?: Record<string, unknown>): TraversalResult {
    const direction = (options?.direction as 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL') ?? 'FORWARD';
    const ordering = (options?.ordering as string) ?? 'ALPHABETICAL';

    const context = new TraversalContext({
      startNode,
      strategy: this.strategy,
      maxDepth: (options?.maxDepth as number) ?? 100,
      maxNodes: (options?.maxNodes as number) ?? 10_000,
      timeout: (options?.timeout as number) ?? 30_000,
      direction,
    });

    this.context = context;
    const startTime = Date.now();

    const stack: Array<{ nodeId: NodeId; depth: number; parentId: NodeId | null; edgeId: string | null }> = [
      { nodeId: startNode, depth: 0, parentId: null, edgeId: null },
    ];

    context.markVisited(startNode);
    context.addStep({
      nodeId: startNode,
      depth: 0,
      parentId: null,
      edgeId: null,
      metadata: {},
    });

    while (stack.length > 0 && context.shouldContinue()) {
      const current = stack.pop()!;
      context.depth = current.depth;

      if (context.visited.size >= context.maxNodes) {
        throw new BoundedTraversalExceededError(context.maxNodes, { strategy: this.strategy });
      }

      if (current.depth >= context.maxDepth) continue;

      const neighbors = this.getNeighbors(current.nodeId, direction);
      const orderedNeighbors = TraversalOrdering.orderNodes(neighbors, ordering as OrderingStrategy);

      for (let i = orderedNeighbors.length - 1; i >= 0; i--) {
        const neighborId = orderedNeighbors[i]!;
        if (!context.shouldContinue()) break;
        if (context.isVisited(neighborId)) continue;

        context.markVisited(neighborId);
        const edge = this.graph.getOutgoingEdges(current.nodeId).find((e) => e.target === neighborId)
          ?? this.graph.getIncomingEdges(current.nodeId).find((e) => e.source === neighborId);

        const step = {
          nodeId: neighborId,
          depth: current.depth + 1,
          parentId: current.nodeId,
          edgeId: edge?.id ?? null,
          metadata: {},
        };

        context.addStep(step as TraversalStep);
        stack.push({ nodeId: neighborId, depth: current.depth + 1, parentId: current.nodeId, edgeId: edge?.id ?? null });
      }
    }

    const status = context.cancelled ? 'CANCELLED' : 'COMPLETED';
    return this.buildResult(context.steps, context.visited, context.depth, startTime, status);
  }
}
