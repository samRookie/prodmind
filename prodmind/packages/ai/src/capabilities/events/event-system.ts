export type CapabilityEventType =
  | 'tool:before'
  | 'tool:after'
  | 'tool:error'
  | 'session:start'
  | 'session:end'
  | 'workflow:stage';

export interface CapabilityEvent {
  readonly type: CapabilityEventType;
  readonly timestamp: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export type EventHandler = (event: CapabilityEvent) => void;

export class CapabilityEventBus {
  private readonly _handlers: Map<CapabilityEventType, Set<EventHandler>> = new Map();

  on(type: CapabilityEventType, handler: EventHandler): void {
    if (!this._handlers.has(type)) {
      this._handlers.set(type, new Set());
    }
    this._handlers.get(type)!.add(handler);
  }

  off(type: CapabilityEventType, handler: EventHandler): void {
    this._handlers.get(type)?.delete(handler);
  }

  emit(type: CapabilityEventType, payload: Readonly<Record<string, unknown>>): void {
    const event: CapabilityEvent = Object.freeze({
      type, timestamp: Date.now(), payload: Object.freeze({ ...payload }),
    });
    this._handlers.get(type)?.forEach(h => h(event));
  }

  listenerCount(type: CapabilityEventType): number {
    return this._handlers.get(type)?.size ?? 0;
  }

  clear(): void {
    this._handlers.clear();
  }
}
