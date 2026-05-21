import type { ExecutionGraph, ExecutionNode, ExecutionNodeResult, ExecutionState } from '../contracts/execution-contracts.ts';
import type { ExecutionContext,NodeHandler } from './node-handler.ts';
import { executeHandler } from './node-handler.ts';

export interface RunnerConfig {
  readonly handlers: Readonly<Record<string, NodeHandler>>;
  readonly defaultHandler?: NodeHandler;
}

export interface NodeExecution {
  readonly nodeId: string;
  readonly result: ExecutionNodeResult;
}

export class ExecutionRunner {
  private readonly handlers: Readonly<Record<string, NodeHandler>>;
  private readonly defaultHandler: NodeHandler;

  constructor(config: RunnerConfig) {
    this.handlers = config.handlers;
    this.defaultHandler = config.defaultHandler ?? (() => Promise.resolve({}));
  }

  async runNode(
    node: ExecutionNode,
    state: Readonly<Record<string, ExecutionNodeResult>>,
    sessionId: string,
  ): Promise<NodeExecution> {
    const handler = this.handlers[node.id] ?? this.defaultHandler;
    const results = state;
    const inputs = this.collectInputs(node, results);

    const context: ExecutionContext = { sessionId, results, inputs };
    const result = await executeHandler(node, handler, context);

    return Object.freeze({ nodeId: node.id, result });
  }

  async runNodes(
    nodeIds: readonly string[],
    graph: ExecutionGraph,
    state: Readonly<Record<string, ExecutionNodeResult>>,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<readonly NodeExecution[]> {
    const results: NodeExecution[] = [];
    for (const id of nodeIds) {
      if (signal?.aborted) break;
      const node = graph.nodes.find(n => n.id === id);
      if (!node) continue;
      const execution = await this.runNode(node, state, sessionId);
      results.push(execution);
    }
    return Object.freeze(results);
  }

  private collectInputs(
    node: ExecutionNode,
    results: Readonly<Record<string, ExecutionNodeResult>>,
  ): Readonly<Record<string, unknown>> {
    const inputs: Record<string, unknown> = {};
    for (const dep of node.dependencies) {
      const depResult = results[dep];
      if (depResult) {
        inputs[dep] = depResult.output;
      }
    }
    return Object.freeze(inputs);
  }
}

export function createNodeStates(
  graph: ExecutionGraph,
): Readonly<Record<string, ExecutionState>> {
  const states: Record<string, ExecutionState> = {};
  for (const node of graph.nodes) {
    states[node.id] = 'pending';
  }
  return Object.freeze(states);
}
