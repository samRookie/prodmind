export const RUNTIME_STATES = ['STARTING', 'READY', 'DEGRADED', 'SHUTTING_DOWN', 'FAILED'] as const;
export type RuntimeState = typeof RUNTIME_STATES[number];

export class RuntimeStateManager {
  private _state: RuntimeState = 'STARTING';
  private _previousState: RuntimeState | null = null;
  private _stateHistory: { state: RuntimeState; timestamp: string }[] = [{ state: 'STARTING', timestamp: new Date().toISOString() }];
  private _failureReasons: string[] = [];

  get state(): RuntimeState { return this._state; }
  get previousState(): RuntimeState | null { return this._previousState; }
  get stateHistory(): readonly { state: RuntimeState; timestamp: string }[] { return this._stateHistory; }
  get failureReasons(): readonly string[] { return this._failureReasons; }

  transition(newState: RuntimeState, reason?: string): void {
    this._previousState = this._state;
    this._state = newState;
    this._stateHistory.push({ state: newState, timestamp: new Date().toISOString() });
    if (reason && (newState === 'DEGRADED' || newState === 'FAILED')) {
      this._failureReasons.push(reason);
    }
  }

  get uptime(): number { return this._stateHistory.length > 0 ? Date.now() - new Date(this._stateHistory[0]!.timestamp).getTime() : 0; }

  get isRunning(): boolean { return this._state === 'READY' || this._state === 'DEGRADED'; }
}
