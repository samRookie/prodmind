import type { GraphEdge, NodeId, TraversalStep, TraversalResult, TraversalStrategy } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { TraversalContext } from './traversal-context.ts';
import { TraversalState } from './traversal-state.ts';
import { TraversalFingerprint } from './traversal-fingerprint.ts';
import { generateId, nowISO } from '../utils/index.ts';

export abstract class GraphTraverser {
  protected context: TraversalContext | null;
  protected graph: GraphContract;

  public abstract readonly strategy: TraversalStrategy;

  constructor(graph: GraphContract) {
    this.graph = graph;
    this.context = null;
  }

  public abstract traverse(startNode: NodeId, options?: Record<string, unknown>): TraversalResult;

  public cancel(): void {
    if (this.context) {
      this.context.cancel();
    }
  }

  public getState(): TraversalState | null {
    if (!this.context) return null;
    return new TraversalState({
      visited: [...this.context.visited],
      steps: [...this.context.steps],
      frontier: [],
      depth: this.context.depth,
    });
  }

  protected buildResult(
    steps: TraversalStep[],
    visited: Set<NodeId>,
    depth: number,
    startTime: number,
    status: string,
  ): TraversalResult {
    const lastStep = steps[steps.length - 1] ?? null;
    const fingerprint = TraversalFingerprint.fromSteps(steps);

    return {
      id: generateId('traversal'),
      strategy: this.strategy,
      steps,
      visited,
      depth,
      nodeCount: visited.size,
      startNode: this.context?.startNode ?? '',
      endNode: lastStep?.nodeId ?? null,
      duration: Date.now() - startTime,
      status: status as TraversalResult['status'],
      fingerprint,
      timestamp: nowISO(),
    };
  }

  protected getNeighbors(nodeId: NodeId, direction: string): NodeId[] {
    let edges: GraphEdge[];
    switch (direction) {
      case 'REVERSE':
        edges = this.graph.getIncomingEdges(nodeId);
        break;
      case 'BIDIRECTIONAL': {
        const out = this.graph.getOutgoingEdges(nodeId);
        const inc = this.graph.getIncomingEdges(nodeId);
        edges = [...out, ...inc];
        break;
      }
      case 'FORWARD':
      default:
        edges = this.graph.getOutgoingEdges(nodeId);
        break;
    }

    const neighborIds = edges.map((e) => {
      if (direction === 'REVERSE' || direction === 'BIDIRECTIONAL') {
        return e.source === nodeId ? e.target : e.source;
      }
      return e.target;
    });

    return [...new Set(neighborIds)];
  }
}
