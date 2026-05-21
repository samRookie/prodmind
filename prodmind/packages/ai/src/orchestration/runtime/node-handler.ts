import type { ExecutionNode, ExecutionNodeResult } from '../contracts/execution-contracts.ts';
import { createExecutionNodeResult } from '../contracts/execution-factories.ts';

export interface ExecutionContext {
  readonly sessionId: string;
  readonly results: Readonly<Record<string, ExecutionNodeResult>>;
  readonly inputs: Readonly<Record<string, unknown>>;
}

export type NodeHandler = (node: ExecutionNode, context: ExecutionContext) => Promise<Record<string, unknown>>;

export function executeHandler(
  node: ExecutionNode,
  handler: NodeHandler,
  context: ExecutionContext,
): Promise<ExecutionNodeResult> {
  const start = Date.now();
  return handler(node, context)
    .then(output => {
      const duration = Date.now() - start;
      return createExecutionNodeResult({ nodeId: node.id, output, durationMs: duration, success: true });
    })
    .catch((err: unknown) => {
      const duration = Date.now() - start;
      return createExecutionNodeResult({
        nodeId: node.id,
        output: {},
        durationMs: duration,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    });
}

export function createPassthroughHandler(): NodeHandler {
  return (_node, context) => Promise.resolve({ ...context.inputs });
}
