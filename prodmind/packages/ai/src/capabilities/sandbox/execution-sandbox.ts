import type { ToolExecutionRequest, ToolExecutionResult } from '../contracts/tool-result.ts';
import { SandboxLimits } from './sandbox-limits.ts';
import { SandboxGovernance } from './sandbox-governance.ts';

export class ExecutionSandbox {
  private readonly _limits: SandboxLimits;
  private readonly _governance: SandboxGovernance;

  constructor(limits?: Partial<SandboxLimits>) {
    this._limits = new SandboxLimits(limits);
    this._governance = new SandboxGovernance(this._limits);
  }

  get limits(): SandboxLimits {
    return this._limits;
  }

  get governance(): SandboxGovernance {
    return this._governance;
  }

  execute(request: ToolExecutionRequest, fn: () => ToolExecutionResult): ToolExecutionResult {
    if (!this._governance.canExecute()) {
      return Object.freeze({
        request,
        status: 'rejected',
        output: null,
        error: 'sandbox governance rejected execution',
        failureCode: 'governance_restriction',
        durationMs: 0,
      });
    }

    const start = Date.now();
    try {
      const result = fn();
      const elapsed = Date.now() - start;
      this._governance.recordExecution(elapsed);
      return Object.freeze({
        ...result,
        request,
        durationMs: elapsed,
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: err instanceof Error ? err.message : 'sandbox execution error',
        failureCode: 'internal_error',
        durationMs: elapsed,
      });
    }
  }

  async executeAsync(request: ToolExecutionRequest, fn: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> {
    if (!this._governance.canExecute()) {
      return Object.freeze({
        request,
        status: 'rejected',
        output: null,
        error: 'sandbox governance rejected execution',
        failureCode: 'governance_restriction',
        durationMs: 0,
      });
    }

    const start = Date.now();
    try {
      const result = await fn();
      const elapsed = Date.now() - start;
      this._governance.recordExecution(elapsed);
      return Object.freeze({
        ...result,
        request,
        durationMs: elapsed,
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: err instanceof Error ? err.message : 'sandbox async execution error',
        failureCode: 'internal_error',
        durationMs: elapsed,
      });
    }
  }

  reset(): void {
    this._governance.reset();
  }
}
