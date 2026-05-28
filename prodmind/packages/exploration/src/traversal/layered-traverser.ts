import { GraphTraverser } from './graph-traverser.ts';
import type { NodeId, TraversalResult, TraversalStrategy } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalContext } from './traversal-context.ts';
import { TraversalOrdering } from './traversal-ordering.ts';
import type { OrderingStrategy } from './traversal-ordering.ts';
import { BoundedTraversalExceededError } from '../errors/index.ts';

export class LayeredTraverser extends GraphTraverser {
  public readonly strategy = 'LAYERED' as TraversalStrategy;

  constructor(graph: GraphContract) {
    super(graph);
  }

  public traverse(startNode: NodeId, options?: Record<string, unknown>): TraversalResult {
    const maxDepth = (options?.maxDepth as number) ?? 100;
    const maxNodes = (options?.maxNodes as number) ?? 10_000;
    const timeout = (options?.timeout as number) ?? 30_000;
    const direction = (options?.direction as 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL') ?? 'FORWARD';
    const ordering = (options?.ordering as string) ?? 'ALPHABETICAL';

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

    context.markVisited(startNode);
    context.addStep({
      nodeId: startNode,
      depth: 0,
      parentId: null,
      edgeId: null,
      metadata: {},
    });

    let currentLayer: NodeId[] = [startNode];
    let depth = 0;

    while (currentLayer.length > 0 && context.shouldContinue() && depth < maxDepth) {
      context.depth = depth;
      const orderedCurrent = TraversalOrdering.orderNodes(currentLayer, ordering as OrderingStrategy);
      const nextLayer: NodeId[] = [];
      const seenInNext = new Set<NodeId>();

      for (const nodeId of orderedCurrent) {
        if (!context.shouldContinue()) break;

        if (context.visited.size >= maxNodes) {
          throw new BoundedTraversalExceededError(maxNodes, {
            strategy: this.strategy,
            depth,
            layer: nodeId,
          });
        }

        const neighbors = this.getNeighbors(nodeId, direction);
        const orderedNeighbors = TraversalOrdering.orderNodes(neighbors, ordering as OrderingStrategy);

        for (const neighborId of orderedNeighbors) {
          if (!context.shouldContinue()) break;
          if (context.isVisited(neighborId)) continue;
          if (seenInNext.has(neighborId)) continue;

          seenInNext.add(neighborId);
          context.markVisited(neighborId);

          const edge = this.graph.getOutgoingEdges(nodeId).find((e) => e.target === neighborId)
            ?? this.graph.getIncomingEdges(nodeId).find((e) => e.source === neighborId);

          context.addStep({
            nodeId: neighborId,
            depth: depth + 1,
            parentId: nodeId,
            edgeId: edge?.id ?? null,
            metadata: { layer: depth + 1 },
          });

          nextLayer.push(neighborId);
        }
      }

      currentLayer = nextLayer;
      depth++;
    }

    const status = context.cancelled ? 'CANCELLED' : 'COMPLETED';
    const resultDepth = Math.min(depth, maxDepth);
    return this.buildResult(context.steps, context.visited, resultDepth, startTime, status);
  }
}
