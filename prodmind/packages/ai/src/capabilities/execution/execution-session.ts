export type SessionEventType =
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'workflow_started'
  | 'workflow_completed'
  | 'agent_started'
  | 'agent_completed';

export interface SessionEvent {
  readonly type: SessionEventType;
  readonly toolId?: string;
  readonly traceId: string;
  readonly status?: string;
  readonly timestamp: number;
}

export class ExecutionSession {
  private readonly _events: SessionEvent[] = [];

  get events(): readonly SessionEvent[] {
    return Object.freeze([...this._events]);
  }

  get count(): number {
    return this._events.length;
  }

  recordEvent(event: SessionEvent): void {
    this._events.push(Object.freeze({ ...event }));
  }

  clear(): void {
    this._events.length = 0;
  }
}
