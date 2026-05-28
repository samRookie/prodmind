import type { TraversalStep, TraversalStrategy, NodeId } from '../types/index.ts';

export interface TraversalContextOptions {
  startNode: NodeId;
  strategy: TraversalStrategy;
  maxDepth?: number;
  maxNodes?: number;
  timeout?: number;
  direction?: 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL';
}

export class TraversalContext {
  public readonly startNode: NodeId;
  public readonly strategy: TraversalStrategy;
  public readonly maxDepth: number;
  public readonly maxNodes: number;
  public readonly timeout: number;
  public readonly direction: 'FORWARD' | 'REVERSE' | 'BIDIRECTIONAL';
  public visited: Set<NodeId>;
  public steps: TraversalStep[];
  public depth: number;
  public cancelled: boolean;
  public startTime: number;

  constructor(options: TraversalContextOptions) {
    this.startNode = options.startNode;
    this.strategy = options.strategy;
    this.maxDepth = options.maxDepth ?? 100;
    this.maxNodes = options.maxNodes ?? 10_000;
    this.timeout = options.timeout ?? 30_000;
    this.direction = options.direction ?? 'FORWARD';
    this.visited = new Set<NodeId>();
    this.steps = [];
    this.depth = 0;
    this.cancelled = false;
    this.startTime = Date.now();
  }

  public shouldContinue(): boolean {
    if (this.cancelled) return false;
    if (this.visited.size >= this.maxNodes) return false;
    if (this.depth > this.maxDepth) return false;
    if (this.elapsed() >= this.timeout) return false;
    return true;
  }

  public markVisited(nodeId: NodeId): void {
    this.visited.add(nodeId);
  }

  public isVisited(nodeId: NodeId): boolean {
    return this.visited.has(nodeId);
  }

  public addStep(step: TraversalStep): void {
    this.steps.push(step);
  }

  public cancel(): void {
    this.cancelled = true;
  }

  public elapsed(): number {
    return Date.now() - this.startTime;
  }
}
