import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface ReplayStep {
  readonly index: number;
  readonly result: ToolExecutionResult;
}

export class ReplaySession {
  private readonly _steps: ReplayStep[] = [];
  private _index = 0;

  get steps(): readonly ReplayStep[] {
    return Object.freeze([...this._steps]);
  }

  get count(): number {
    return this._steps.length;
  }

  record(result: ToolExecutionResult): void {
    this._steps.push(Object.freeze({
      index: this._steps.length,
      result,
    }));
  }

  replay(): readonly ToolExecutionResult[] {
    return Object.freeze(this._steps.map(s => s.result));
  }

  *iterate(): Generator<ReplayStep, void, unknown> {
    for (const step of this._steps) {
      yield step;
    }
  }

  clear(): void {
    this._steps.length = 0;
    this._index = 0;
  }
}
