import type { CapabilityEvent, CapabilityEventType } from './event-system.ts';

export interface StoredEvent {
  readonly id: string;
  readonly type: CapabilityEventType;
  readonly timestamp: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export class CapabilityEventStore {
  private readonly _events: StoredEvent[] = [];
  private _counter = 0;

  get events(): readonly StoredEvent[] {
    return Object.freeze([...this._events]);
  }

  append(event: CapabilityEvent): StoredEvent {
    this._counter++;
    const stored: StoredEvent = Object.freeze({
      id: `evt_${this._counter}`,
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    });
    this._events.push(stored);
    return stored;
  }

  getByType(type: CapabilityEventType): readonly StoredEvent[] {
    return Object.freeze(
      this._events.filter(e => e.type === type)
        .sort((a, b) => a.timestamp - b.timestamp),
    );
  }

  getByTimeRange(start: number, end: number): readonly StoredEvent[] {
    return Object.freeze(
      this._events.filter(e => e.timestamp >= start && e.timestamp <= end),
    );
  }

  getLatest(count: number): readonly StoredEvent[] {
    return Object.freeze(this._events.slice(-count));
  }

  replayEvents(): readonly StoredEvent[] {
    return Object.freeze([...this._events]);
  }

  clear(): void {
    this._events.length = 0;
    this._counter = 0;
  }

  get size(): number {
    return this._events.length;
  }
}
