import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

export interface PlanStep {
  readonly id: string;
  readonly toolId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly dependsOn: readonly string[];
}

export interface Plan {
  readonly steps: readonly PlanStep[];
  readonly description: string;
}

export class PlanningAgent {
  private readonly _executor: ToolExecutor;

  constructor(policy: CapabilityPolicy) {
    this._executor = new ToolExecutor(policy);
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  plan(goal: string, availableTools: readonly string[]): Plan {
    const steps: PlanStep[] = [];

    for (let i = 0; i < availableTools.length; i++) {
      steps.push(Object.freeze({
        id: `step_${i}`,
        toolId: availableTools[i]!,
        input: Object.freeze({ goal, stepIndex: i }),
        dependsOn: i > 0 ? Object.freeze([`step_${i - 1}`]) : Object.freeze([]),
      }));
    }

    return Object.freeze({
      steps: Object.freeze(steps),
      description: `plan for: ${goal} with ${availableTools.length} tools`,
    });
  }

  reset(): void {
    this._executor.reset();
  }
}
