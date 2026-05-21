import type { ToolExecutionRequest, ToolExecutionResult } from '../contracts/tool-result.ts';
import type { CapabilityPolicy } from '../contracts/capability-policy.ts';
import { ExecutionSandbox } from '../sandbox/execution-sandbox.ts';
import { ExecutionRunner } from './execution-runner.ts';
import { ExecutionSession } from './execution-session.ts';
import { ExecutionTimeout } from './execution-timeout.ts';

export class ToolExecutor {
  private readonly _sandbox: ExecutionSandbox;
  private readonly _runner: ExecutionRunner;
  readonly session: ExecutionSession;
  private readonly _timeout: ExecutionTimeout;

  constructor(policy: CapabilityPolicy) {
    this._sandbox = new ExecutionSandbox({
      maxExecutions: policy.maxToolCalls,
      maxCumulativeDurationMs: policy.maxDurationMs,
    });
    this._runner = new ExecutionRunner();
    this.session = new ExecutionSession();
    this._timeout = new ExecutionTimeout(policy.maxDurationMs);
  }

  get sandbox(): ExecutionSandbox {
    return this._sandbox;
  }

  execute(toolId: string, input: Readonly<Record<string, unknown>>, traceId: string): ToolExecutionResult {
    const request = Object.freeze<ToolExecutionRequest>({
      toolId, input, traceId, timestamp: Date.now(),
    });

    this.session.recordEvent({ type: 'execution_started', toolId, traceId, timestamp: Date.now() });

    const result = this._sandbox.execute(request, () =>
      this._runner.run(request),
    );

    this.session.recordEvent({
      type: 'execution_completed', toolId, traceId,
      status: result.status, timestamp: Date.now(),
    });

    return result;
  }

  async executeAsync(toolId: string, input: Readonly<Record<string, unknown>>, traceId: string): Promise<ToolExecutionResult> {
    const request = Object.freeze<ToolExecutionRequest>({
      toolId, input, traceId, timestamp: Date.now(),
    });

    this.session.recordEvent({ type: 'execution_started', toolId, traceId, timestamp: Date.now() });

    const result = await this._timeout.withTimeout(
      this._sandbox.executeAsync(request, () =>
        this._runner.runAsync(request),
      ),
    );

    this.session.recordEvent({
      type: 'execution_completed', toolId, traceId,
      status: result.status, timestamp: Date.now(),
    });

    return result;
  }

  reset(): void {
    this._sandbox.reset();
    this.session.clear();
  }
}
