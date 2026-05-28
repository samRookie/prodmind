import type { NodeId, TraversalStep } from '../types/index.ts';

export class ExplorationState {
  private visited: Set<NodeId>;
  private steps: TraversalStep[];
  private depth: number;

  constructor() {
    this.visited = new Set<NodeId>();
    this.steps = [];
    this.depth = 0;
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

  public getVisited(): NodeId[] {
    return Array.from(this.visited);
  }

  public getStepCount(): number {
    return this.steps.length;
  }

  public getDepth(): number {
    return this.depth;
  }

  public setDepth(depth: number): void {
    this.depth = depth;
  }

  public snapshot(): { visited: NodeId[]; steps: TraversalStep[]; depth: number } {
    return {
      visited: Array.from(this.visited),
      steps: [...this.steps],
      depth: this.depth,
    };
  }

  public restore(state: { visited: NodeId[]; steps: TraversalStep[]; depth: number }): void {
    this.visited = new Set(state.visited);
    this.steps = [...state.steps];
    this.depth = state.depth;
  }

  public clear(): void {
    this.visited.clear();
    this.steps = [];
    this.depth = 0;
  }
}
