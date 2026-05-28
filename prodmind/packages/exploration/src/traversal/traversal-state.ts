import type { NodeId, TraversalStep } from '../types/index.ts';
import { computeHash } from '../utils/index.ts';

export class TraversalState {
  public readonly visited: readonly NodeId[];
  public readonly steps: readonly TraversalStep[];
  public readonly frontier: readonly NodeId[];
  public readonly depth: number;
  public readonly fingerprint: string;

  constructor(opts: { visited: NodeId[]; steps: TraversalStep[]; frontier: NodeId[]; depth: number }) {
    this.visited = Object.freeze([...opts.visited]);
    this.steps = Object.freeze([...opts.steps]);
    this.frontier = Object.freeze([...opts.frontier]);
    this.depth = opts.depth;
    this.fingerprint = this.computeFingerprint();
  }

  public withVisited(nodeId: NodeId): TraversalState {
    return new TraversalState({
      visited: [...this.visited, nodeId],
      steps: [...this.steps],
      frontier: [...this.frontier],
      depth: this.depth,
    });
  }

  public withStep(step: TraversalStep): TraversalState {
    return new TraversalState({
      visited: [...this.visited],
      steps: [...this.steps, step],
      frontier: [...this.frontier],
      depth: this.depth,
    });
  }

  public withFrontier(frontier: NodeId[]): TraversalState {
    return new TraversalState({
      visited: [...this.visited],
      steps: [...this.steps],
      frontier,
      depth: this.depth,
    });
  }

  public withDepth(depth: number): TraversalState {
    return new TraversalState({
      visited: [...this.visited],
      steps: [...this.steps],
      frontier: [...this.frontier],
      depth,
    });
  }

  public computeFingerprint(): string {
    const sortedVisited = [...this.visited].sort();
    return computeHash(
      JSON.stringify({
        visited: sortedVisited,
        depth: this.depth,
        stepCount: this.steps.length,
        frontier: [...this.frontier].sort(),
      }),
    );
  }
}
