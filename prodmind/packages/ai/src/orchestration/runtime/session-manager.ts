import type { ExecutionEvent, ExecutionEventType, ExecutionGraph, ExecutionNodeResult,ExecutionState } from '../contracts/execution-contracts.ts';
import { canTransition } from '../contracts/execution-state.ts';

export interface SessionState {
  readonly nodeStates: Readonly<Record<string, ExecutionState>>;
  readonly timeline: readonly ExecutionEvent[];
  readonly running: readonly string[];
  readonly completed: readonly string[];
  readonly failed: readonly string[];
  readonly allDone: boolean;
  readonly hasFailed: boolean;
}

export class SessionManager {
  private nodeStates: Record<string, ExecutionState>;
  private timelineEvents: ExecutionEvent[] = [];
  private sequenceCounter = 0;
  private readonly graph: ExecutionGraph;

  constructor(graph: ExecutionGraph) {
    this.graph = graph;
    this.nodeStates = {};
    for (const node of graph.nodes) {
      this.nodeStates[node.id] = 'pending';
    }
  }

  getNodeStates(): Readonly<Record<string, ExecutionState>> {
    return Object.freeze({ ...this.nodeStates });
  }

  getTimeline(): readonly ExecutionEvent[] {
    return Object.freeze([...this.timelineEvents]);
  }

  getState(): SessionState {
    const running: string[] = [];
    const completed: string[] = [];
    const failed: string[] = [];
    let allDone = true;
    let hasFailed = false;

    for (const node of this.graph.nodes) {
      const state = this.nodeStates[node.id];
      if (state === 'running') running.push(node.id);
      if (state === 'completed') completed.push(node.id);
      if (state === 'failed') { failed.push(node.id); hasFailed = true; }
      if (state !== 'completed' && state !== 'failed' && state !== 'cancelled') {
        allDone = false;
      }
    }

    return Object.freeze({
      nodeStates: this.getNodeStates(),
      timeline: this.getTimeline(),
      running: Object.freeze(running.sort()),
      completed: Object.freeze(completed.sort()),
      failed: Object.freeze(failed.sort()),
      allDone,
      hasFailed,
    });
  }

  transition(nodeId: string, toState: ExecutionState): void {
    const current = this.nodeStates[nodeId];
    if (!current) {
      throw new Error(`Unknown node: "${nodeId}"`);
    }
    if (current === toState) return;
    if (!canTransition(current, toState)) {
      throw new Error(`Invalid transition: "${current}" → "${toState}" for node "${nodeId}"`);
    }
    this.nodeStates[nodeId] = toState;
  }

  emit(nodeId: string, type: ExecutionEventType, data?: Record<string, unknown>): ExecutionEvent {
    this.sequenceCounter++;
    const event: ExecutionEvent = Object.freeze({
      sequenceId: this.sequenceCounter,
      type,
      nodeId,
      timestamp: new Date().toISOString(),
      data: Object.freeze({ ...data }),
    });
    this.timelineEvents.push(event);
    return event;
  }

  recordResult(nodeId: string, result: ExecutionNodeResult): void {
    const state: ExecutionState = result.success ? 'completed' : 'failed';
    this.transition(nodeId, state);
    this.emit(nodeId, result.success ? 'completed' : 'failed', {
      durationMs: result.durationMs,
      error: result.error || undefined,
    });
  }

  markReady(nodeId: string): void {
    this.transition(nodeId, 'ready');
  }

  markRunning(nodeId: string): void {
    const current = this.nodeStates[nodeId];
    if (current === 'pending') {
      this.transition(nodeId, 'ready');
    }
    this.transition(nodeId, 'running');
    this.emit(nodeId, 'started');
  }

  getRunning(): readonly string[] {
    return Object.freeze(
      this.graph.nodes
        .filter(n => this.nodeStates[n.id] === 'running')
        .map(n => n.id)
        .sort(),
    );
  }
}
