import type { ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

export interface ValidationInput {
  readonly results: readonly ToolExecutionResult[];
  readonly rules: readonly string[];
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly violations: readonly string[];
  readonly checkedCount: number;
}

export class ValidationAgent {
  private readonly _executor: ToolExecutor;

  constructor(policy: CapabilityPolicy) {
    this._executor = new ToolExecutor(policy);
  }

  get executor(): ToolExecutor {
    return this._executor;
  }

  validate(input: ValidationInput): ValidationReport {
    const violations: string[] = [];

    for (const rule of input.rules) {
      for (const result of input.results) {
        if (result.status === 'failed' || result.status === 'rejected' || result.status === 'timed_out') {
          violations.push(`rule "${rule}" failed for tool ${result.request.toolId}: ${result.error}`);
        }
      }
    }

    return Object.freeze({
      valid: violations.length === 0,
      violations: Object.freeze(violations),
      checkedCount: input.results.length * input.rules.length,
    });
  }

  reset(): void {
    this._executor.reset();
  }
}
