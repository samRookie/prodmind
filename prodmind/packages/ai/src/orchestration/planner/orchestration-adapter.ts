import type { ExecutionGraph } from '../contracts/execution-contracts.ts';
import type { NodeHandler } from '../runtime/node-handler.ts';
import { OrchestrationRuntime, type RuntimeResult } from '../runtime/orchestration-runtime.ts';
import { ExecutionPlanner, type PlanInput } from './execution-planner.ts';
import { ProviderExecutionBridge, type ProviderFn } from './provider-bridge.ts';

export interface AdapterConfig {
  readonly provider: ProviderFn;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxConcurrency?: number;
  readonly handlers?: Readonly<Record<string, NodeHandler>>;
}

export class OrchestrationAIAdapter {
  private readonly planner: ExecutionPlanner;
  private readonly bridge: ProviderExecutionBridge;
  private readonly runtime: OrchestrationRuntime;
  constructor(config: AdapterConfig) {
    this.planner = new ExecutionPlanner();
    this.bridge = new ProviderExecutionBridge();
    this.runtime = new OrchestrationRuntime({
      handlers: config.handlers ?? {},
      defaultHandler: this.bridge.createHandler(config.provider, {
        model: config.model,
        temperature: config.temperature,
      }),
      maxConcurrency: config.maxConcurrency,
    });
  }

  async run(input: PlanInput, sessionId?: string): Promise<RuntimeResult> {
    const graph = this.planner.plan(input);
    return this.runtime.execute(graph, sessionId);
  }

  async runGraph(graph: ExecutionGraph, sessionId?: string): Promise<RuntimeResult> {
    return this.runtime.execute(graph, sessionId);
  }

  getPlanner(): ExecutionPlanner {
    return this.planner;
  }
}
