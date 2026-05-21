export type ExecutionNodeType = 'prompt' | 'transform' | 'decision' | 'aggregation' | 'validation';

export type ExecutionEventType = 'scheduled' | 'started' | 'completed' | 'failed' | 'cancelled' | 'replayed';

export interface ExecutionNode {
  readonly id: string;
  readonly type: ExecutionNodeType;
  readonly label: string;
  readonly config: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
}

export interface ExecutionEdge {
  readonly source: string;
  readonly target: string;
  readonly condition: string;
}

export interface ExecutionGraph {
  readonly id: string;
  readonly nodes: readonly ExecutionNode[];
  readonly edges: readonly ExecutionEdge[];
  readonly metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  readonly correlationId: string;
  readonly fingerprint: string;
  readonly source: string;
}

export interface ExecutionEvent {
  readonly sequenceId: number;
  readonly type: ExecutionEventType;
  readonly nodeId: string;
  readonly timestamp: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface ExecutionSession {
  readonly id: string;
  readonly graph: ExecutionGraph;
  readonly state: ExecutionState;
  readonly nodeStates: Readonly<Record<string, ExecutionState>>;
  readonly timeline: readonly ExecutionEvent[];
  readonly metadata: ExecutionMetadata;
  readonly startedAt: string;
  readonly completedAt: string;
}

export interface ExecutionNodeResult {
  readonly nodeId: string;
  readonly output: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error: string;
}

export type ExecutionState = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled' | 'replaying';

export const EXECUTION_NODE_TYPES: readonly ExecutionNodeType[] = Object.freeze([
  'prompt', 'transform', 'decision', 'aggregation', 'validation',
] as const);

export const EXECUTION_STATES: readonly ExecutionState[] = Object.freeze([
  'pending', 'ready', 'running', 'completed', 'failed', 'cancelled', 'replaying',
] as const);

export const EXECUTION_EVENT_TYPES: readonly ExecutionEventType[] = Object.freeze([
  'scheduled', 'started', 'completed', 'failed', 'cancelled', 'replayed',
] as const);
