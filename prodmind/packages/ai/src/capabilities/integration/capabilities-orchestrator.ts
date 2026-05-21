import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import { WorkflowEngine } from '../workflows/workflow-engine.ts';
import { CapabilityEventBus, type CapabilityEventType } from '../events/event-system.ts';
import { PolicyEnforcer } from '../governance/policy-enforcer.ts';

export interface OrchestratorConfig {
  readonly policy: CapabilityPolicy;
  readonly maxParallel: number;
}

export class CapabilitiesOrchestrator {
  readonly executor: ToolExecutor;
  readonly workflow: WorkflowEngine;
  readonly eventBus: CapabilityEventBus;
  readonly enforcer: PolicyEnforcer;
  private readonly _maxParallel: number;

  constructor(config?: Partial<OrchestratorConfig>) {
    const resolved: OrchestratorConfig = {
      policy: config?.policy ?? { maxToolCalls: 10, maxDurationMs: 30000, allowFailure: true, maxConcurrency: 3 },
      maxParallel: config?.maxParallel ?? 3,
    };
    this.executor = new ToolExecutor(resolved.policy);
    this.workflow = new WorkflowEngine(resolved.policy);
    this.eventBus = new CapabilityEventBus();
    this.enforcer = new PolicyEnforcer(resolved.policy);
    this._maxParallel = resolved.maxParallel;
  }

  get maxParallel(): number {
    return this._maxParallel;
  }

  executeTool(toolId: string, input: Readonly<Record<string, unknown>>, traceId: string): ToolExecutionResult {
    this.eventBus.emit('tool:before', { toolId, traceId });
    const result = this.executor.execute(toolId, input, traceId);
    this.eventBus.emit('tool:after', { toolId, traceId, status: result.status });
    return result;
  }

  runWorkflow(tracePrefix: string) {
    return this.workflow.run(tracePrefix);
  }

  on(event: CapabilityEventType, handler: (event: { type: string; payload: Readonly<Record<string, unknown>> }) => void): void {
    this.eventBus.on(event, handler);
  }

  reset(): void {
    this.executor.reset();
    this.workflow.reset();
    this.enforcer.reset();
  }
}
