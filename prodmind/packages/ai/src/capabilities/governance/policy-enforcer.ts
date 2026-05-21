import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface EnforcementResult {
  readonly allowed: boolean;
  readonly reason: string | null;
  readonly violations: readonly string[];
}

export class PolicyEnforcer {
  private readonly _policy: CapabilityPolicy;
  private _toolCallCount = 0;
  private _totalDurationMs = 0;

  constructor(policy: CapabilityPolicy) {
    this._policy = policy;
  }

  get policy(): CapabilityPolicy {
    return this._policy;
  }

  checkToolCall(): EnforcementResult {
    const violations: string[] = [];

    if (this._toolCallCount >= this._policy.maxToolCalls) {
      violations.push(`max tool calls (${this._policy.maxToolCalls}) exceeded`);
    }

    if (violations.length > 0) {
      return Object.freeze({ allowed: false, reason: violations[0]!, violations: Object.freeze(violations) });
    }

    return Object.freeze({ allowed: true, reason: null, violations: Object.freeze([]) });
  }

  recordExecution(durationMs: number): void {
    this._toolCallCount++;
    this._totalDurationMs += durationMs;
  }

  checkDuration(): EnforcementResult {
    const violations: string[] = [];

    if (this._totalDurationMs >= this._policy.maxDurationMs) {
      violations.push(`max duration (${this._policy.maxDurationMs}ms) exceeded`);
    }

    if (violations.length > 0) {
      return Object.freeze({ allowed: false, reason: violations[0]!, violations: Object.freeze(violations) });
    }

    return Object.freeze({ allowed: true, reason: null, violations: Object.freeze([]) });
  }

  checkResult(result: ToolExecutionResult): EnforcementResult {
    const violations: string[] = [];

    if (result.status === 'failed' && !this._policy.allowFailure) {
      violations.push('failures not allowed by policy');
    }

    if (violations.length > 0) {
      return Object.freeze({ allowed: false, reason: violations[0]!, violations: Object.freeze(violations) });
    }

    return Object.freeze({ allowed: true, reason: null, violations: Object.freeze([]) });
  }

  reset(): void {
    this._toolCallCount = 0;
    this._totalDurationMs = 0;
  }
}
