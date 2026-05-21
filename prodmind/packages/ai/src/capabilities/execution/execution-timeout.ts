import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export class ExecutionTimeout {
  private readonly _maxDurationMs: number;

  constructor(maxDurationMs: number) {
    this._maxDurationMs = maxDurationMs;
  }

  get maxDurationMs(): number {
    return this._maxDurationMs;
  }

  async withTimeout<T extends ToolExecutionResult>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`execution timed out after ${this._maxDurationMs}ms`));
      }, this._maxDurationMs);
    });

    try {
      const result = await Promise.race([promise, timeout]);
      return result;
    } catch (err) {
      const isTimeout = err instanceof Error && err.message.includes('timed out');
      return Object.freeze({
        request: Object.freeze({
          toolId: '', input: Object.freeze({}), traceId: '', timestamp: 0,
        }),
        status: 'timed_out' as const,
        output: null,
        error: isTimeout ? err.message : 'execution cancelled',
        failureCode: isTimeout ? 'timeout' as const : 'internal_error' as const,
        durationMs: this._maxDurationMs,
      }) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
