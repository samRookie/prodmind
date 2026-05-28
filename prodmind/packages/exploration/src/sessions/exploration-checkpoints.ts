import type { SessionId, TraversalStep, NodeId } from '../types/index.ts';
import { generateId, nowISO } from '../utils/index.ts';

export class ExplorationCheckpoints {
  private checkpoints: Map<SessionId, Map<string, { steps: TraversalStep[]; visited: NodeId[]; depth: number; timestamp: string }>>;

  constructor() {
    this.checkpoints = new Map();
  }

  public createCheckpoint(
    sessionId: SessionId,
    label: string,
    state: { steps: TraversalStep[]; visited: NodeId[]; depth: number },
  ): string {
    if (!this.checkpoints.has(sessionId)) {
      this.checkpoints.set(sessionId, new Map());
    }
    const id = label || generateId('ckpt');
    const sessionCheckpoints = this.checkpoints.get(sessionId)!;
    sessionCheckpoints.set(id, {
      steps: [...state.steps],
      visited: [...state.visited],
      depth: state.depth,
      timestamp: nowISO(),
    });
    return id;
  }

  public restoreCheckpoint(
    sessionId: SessionId,
    label: string,
  ): { steps: TraversalStep[]; visited: NodeId[]; depth: number } | undefined {
    const sessionCheckpoints = this.checkpoints.get(sessionId);
    if (!sessionCheckpoints) return undefined;
    const checkpoint = sessionCheckpoints.get(label);
    if (!checkpoint) return undefined;
    return {
      steps: [...checkpoint.steps],
      visited: [...checkpoint.visited],
      depth: checkpoint.depth,
    };
  }

  public deleteCheckpoint(sessionId: SessionId, label: string): void {
    const sessionCheckpoints = this.checkpoints.get(sessionId);
    if (sessionCheckpoints) {
      sessionCheckpoints.delete(label);
    }
  }

  public listCheckpoints(sessionId: SessionId): string[] {
    const sessionCheckpoints = this.checkpoints.get(sessionId);
    if (!sessionCheckpoints) return [];
    return Array.from(sessionCheckpoints.keys());
  }

  public clearSession(sessionId: SessionId): void {
    this.checkpoints.delete(sessionId);
  }
}
