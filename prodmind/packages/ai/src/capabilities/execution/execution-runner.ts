import type { ToolExecutionRequest, ToolExecutionResult } from '../contracts/tool-result.ts';

export type ToolHandler = (input: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>> | null;
export type AsyncToolHandler = (input: Readonly<Record<string, unknown>>) => Promise<Readonly<Record<string, unknown>> | null>;

export class ExecutionRunner {
  private _handler: ToolHandler | null = null;
  private _asyncHandler: AsyncToolHandler | null = null;

  setHandler(handler: ToolHandler): void {
    this._handler = handler;
  }

  setAsyncHandler(handler: AsyncToolHandler): void {
    this._asyncHandler = handler;
  }

  run(request: ToolExecutionRequest): ToolExecutionResult {
    if (!this._handler) {
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: 'no handler registered',
        failureCode: 'internal_error',
        durationMs: 0,
      });
    }

    try {
      const output = this._handler(request.input);
      return Object.freeze({
        request,
        status: 'completed',
        output: output ? Object.freeze({ ...output }) : null,
        error: null,
        failureCode: null,
        durationMs: 0,
      });
    } catch (err) {
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: err instanceof Error ? err.message : 'execution error',
        failureCode: 'internal_error',
        durationMs: 0,
      });
    }
  }

  async runAsync(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    if (!this._asyncHandler) {
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: 'no async handler registered',
        failureCode: 'internal_error',
        durationMs: 0,
      });
    }

    try {
      const output = await this._asyncHandler(request.input);
      return Object.freeze({
        request,
        status: 'completed',
        output: output ? Object.freeze({ ...output }) : null,
        error: null,
        failureCode: null,
        durationMs: 0,
      });
    } catch (err) {
      return Object.freeze({
        request,
        status: 'failed',
        output: null,
        error: err instanceof Error ? err.message : 'async execution error',
        failureCode: 'internal_error',
        durationMs: 0,
      });
    }
  }
}
