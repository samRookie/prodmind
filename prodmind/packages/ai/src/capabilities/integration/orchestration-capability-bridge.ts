import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';
import { CapabilityEventBus, type CapabilityEventType } from '../events/event-system.ts';
import { CapabilityGovernance } from '../governance/capability-governance.ts';

export class OrchestrationCapabilityBridge {
  readonly executor: ToolExecutor;
  readonly eventBus: CapabilityEventBus;
  readonly governance: CapabilityGovernance;

  constructor(policy: CapabilityPolicy) {
    this.executor = new ToolExecutor(policy);
    this.eventBus = new CapabilityEventBus();
    this.governance = new CapabilityGovernance(policy);
  }

  executeTool(toolId: string, input: Readonly<Record<string, unknown>>, traceId: string, source?: string): ToolExecutionResult {
    const report = this.governance.checkExecution(toolId, source ?? 'orchestration');
    this.eventBus.emit('tool:before', { toolId, traceId, governanceAllowed: report.allowed });

    if (!report.allowed) {
      return Object.freeze({
        request: Object.freeze({ toolId, input, traceId, timestamp: Date.now() }),
        status: 'failed' as const,
        output: Object.freeze({}),
        error: `governance blocked: ${report.reasons.join(', ')}`,
        failureCode: 'governance_restriction' as const,
        durationMs: 0,
      });
    }

    const result = this.executor.execute(toolId, input, traceId);
    this.governance.recordExecution(toolId, result, result.durationMs);
    this.eventBus.emit('tool:after', { toolId, traceId, status: result.status });

    return result;
  }

  on(event: CapabilityEventType, handler: (event: { type: string; payload: Readonly<Record<string, unknown>> }) => void): void {
    this.eventBus.on(event, handler);
  }

  reset(): void {
    this.executor.reset();
    this.governance.reset();
  }
}
