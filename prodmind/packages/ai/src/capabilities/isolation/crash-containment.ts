import type { ToolExecutionResult } from '../contracts/tool-result.ts';

export interface CrashEvent {
  readonly toolId: string;
  readonly traceId: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly error: string;
  readonly timestamp: number;
}

export class CrashContainment {
  private readonly _events: CrashEvent[] = [];
  private _crashCount = 0;
  private _maxCrashes: number;

  constructor(maxCrashes = 5) {
    this._maxCrashes = maxCrashes;
  }

  get events(): readonly CrashEvent[] {
    return Object.freeze([...this._events]);
  }

  get crashCount(): number {
    return this._crashCount;
  }

  get isCritical(): boolean {
    return this._crashCount >= this._maxCrashes;
  }

  report(result: ToolExecutionResult, severity: CrashEvent['severity'] = 'medium'): CrashEvent {
    this._crashCount++;
    const event: CrashEvent = Object.freeze({
      toolId: result.request.toolId,
      traceId: result.request.traceId,
      severity,
      error: result.error ?? 'unknown crash',
      timestamp: Date.now(),
    });
    this._events.push(event);
    return event;
  }

  canContinue(): boolean {
    return this._crashCount < this._maxCrashes;
  }

  clear(): void {
    this._events.length = 0;
    this._crashCount = 0;
  }
}
