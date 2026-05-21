import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import { WorkflowGraph } from './workflow-graph.ts';
import { WorkflowState } from './workflow-state.ts';

export class WorkflowScheduler {
  private readonly _maxParallel: number;

  constructor(maxParallel = 3) {
    this._maxParallel = maxParallel;
  }

  schedule(graph: WorkflowGraph, state: WorkflowState, executor: ToolExecutor, tracePrefix: string): readonly ToolExecutionResult[] {
    const results: ToolExecutionResult[] = [];
    const completedIds: string[] = [];
    let ready = graph.getReadyNodes(completedIds);

    while (ready.length > 0) {
      const batch = ready.slice(0, this._maxParallel);

      for (const node of batch) {
        state.startStage(node.id);
        const result = executor.execute(node.toolId, node.input, `${tracePrefix}_${node.id}`);
        results.push(result);
        state.completeStage(node.id);
        completedIds.push(node.id);
      }

      ready = graph.getReadyNodes(completedIds);
    }

    state.complete();
    return Object.freeze(results);
  }
}
