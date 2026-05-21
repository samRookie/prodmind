import type {
  ExecutionEdge,
  ExecutionEvent,
  ExecutionEventType,
  ExecutionGraph,
  ExecutionMetadata,
  ExecutionNode,
  ExecutionNodeResult,
  ExecutionSession,
  ExecutionState,
} from './execution-contracts.ts';

let idCounter = 0;

export function generateExecutionId(prefix = 'exec'): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

export function createExecutionNode(input: {
  id: string;
  type: ExecutionNode['type'];
  label: string;
  config?: Record<string, unknown>;
  dependencies?: readonly string[];
}): ExecutionNode {
  return Object.freeze({
    id: input.id,
    type: input.type,
    label: input.label,
    config: Object.freeze({ ...input.config }),
    dependencies: Object.freeze([...(input.dependencies ?? [])]),
  });
}

export function createExecutionEdge(input: {
  source: string;
  target: string;
  condition?: string;
}): ExecutionEdge {
  return Object.freeze({
    source: input.source,
    target: input.target,
    condition: input.condition ?? '',
  });
}

export function createExecutionGraph(input: {
  id?: string;
  nodes: readonly ExecutionNode[];
  edges?: readonly ExecutionEdge[];
  metadata?: Partial<ExecutionMetadata>;
}): ExecutionGraph {
  return Object.freeze({
    id: input.id ?? generateExecutionId('graph'),
    nodes: Object.freeze(input.nodes.map(n => Object.freeze({ ...n }))),
    edges: Object.freeze([...(input.edges ?? [])].map(e => Object.freeze({ ...e }))),
    metadata: createExecutionMetadata(input.metadata),
  });
}

export function createExecutionMetadata(input?: Partial<ExecutionMetadata>): ExecutionMetadata {
  return Object.freeze({
    correlationId: input?.correlationId ?? '',
    fingerprint: input?.fingerprint ?? '',
    source: input?.source ?? '',
  });
}

export function createExecutionSession(input: {
  id?: string;
  graph: ExecutionGraph;
  metadata?: Partial<ExecutionMetadata>;
}): ExecutionSession {
  const nodeStates: Record<string, ExecutionState> = {};
  for (const node of input.graph.nodes) {
    nodeStates[node.id] = 'pending';
  }

  return Object.freeze({
    id: input.id ?? generateExecutionId('session'),
    graph: input.graph,
    state: 'pending' as ExecutionState,
    nodeStates: Object.freeze(nodeStates),
    timeline: Object.freeze([]),
    metadata: createExecutionMetadata(input.metadata),
    startedAt: '',
    completedAt: '',
  });
}

export function createExecutionEvent(input: {
  sequenceId: number;
  type: ExecutionEventType;
  nodeId: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}): ExecutionEvent {
  return Object.freeze({
    sequenceId: input.sequenceId,
    type: input.type,
    nodeId: input.nodeId,
    timestamp: input.timestamp ?? '',
    data: Object.freeze({ ...input.data }),
  });
}

export function createExecutionNodeResult(input: {
  nodeId: string;
  output?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  error?: string;
}): ExecutionNodeResult {
  return Object.freeze({
    nodeId: input.nodeId,
    output: Object.freeze({ ...input.output }),
    durationMs: input.durationMs ?? 0,
    success: input.success ?? true,
    error: input.error ?? '',
  });
}
