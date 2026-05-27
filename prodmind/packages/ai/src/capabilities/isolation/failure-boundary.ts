import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface BoundaryEvent {
  readonly toolId: string;
  readonly traceId: string;
  readonly error: string;
  readonly contained: boolean;
  readonly timestamp: number;
}

export class FailureBoundary {
  private readonly _events: BoundaryEvent[] = [];
  private _isTripped = false;

  get events(): readonly BoundaryEvent[] {
    return Object.freeze([...this._events]);
  }

  get isTripped(): boolean {
    return this._isTripped;
  }

  contain(result: ToolExecutionResult, error?: string): BoundaryEvent {
    const event: BoundaryEvent = Object.freeze({
      toolId: result.request.toolId,
      traceId: result.request.traceId,
      error: error ?? result.error ?? 'unknown error',
      contained: !this._isTripped,
      timestamp: Date.now(),
    });
    this._events.push(event);
    return event;
  }

  trip(): void {
    this._isTripped = true;
  }

  reset(): void {
    this._isTripped = false;
  }

  clear(): void {
    this._events.length = 0;
    this._isTripped = false;
  }

  get failureCount(): number {
    return this._events.length;
  }
}
