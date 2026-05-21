import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import { WorkflowGraph } from './workflow-graph.ts';
import { WorkflowState } from './workflow-state.ts';
import { WorkflowScheduler } from './workflow-scheduler.ts';
import { WorkflowGovernance } from './workflow-governance.ts';

export interface WorkflowResult {
  readonly state: WorkflowState;
  readonly resultCount: number;
  readonly success: boolean;
}

export class WorkflowEngine {
  private readonly _executor: ToolExecutor;
  private readonly _scheduler: WorkflowScheduler;
  readonly governance: WorkflowGovernance;
  readonly graph: WorkflowGraph;
  readonly state: WorkflowState;

  constructor(policy: CapabilityPolicy) {
    this._executor = new ToolExecutor(policy);
    this._scheduler = new WorkflowScheduler(policy.maxConcurrency);
    this.governance = new WorkflowGovernance({ maxNodes: policy.maxToolCalls });
    this.graph = new WorkflowGraph();
    this.state = new WorkflowState();
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  addNode(id: string, toolId: string, input: Readonly<Record<string, unknown>>, dependsOn?: readonly string[]): void {
    if (!this.governance.canAddNode(this.graph.count)) return;
    this.graph.addNode(id, toolId, input, dependsOn);
    this.state.addStage(id, toolId);
  }

  run(tracePrefix: string): WorkflowResult {
    const results = this._scheduler.schedule(this.graph, this.state, this._executor, tracePrefix);
    const success = this.state.status === 'completed';

    return Object.freeze({
      state: this.state,
      resultCount: results.length,
      success,
    });
  }

  reset(): void {
    this._executor.reset();
    this.graph.clear();
  }
}
