import { createMemoryRecord, createProvenanceRecord, generateMemoryId } from '../contracts/memory-factories.ts';
import type { GraphMemoryStore } from '../graph/graph-memory-store.ts';

export interface ReplayEvent {
  readonly id: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: number;
  readonly provenanceId: string;
  readonly parentId?: string;
}

export class ReplayRecorder {
  private readonly _events: ReplayEvent[] = [];
  private _lastEventId: string | undefined;
  private _store?: GraphMemoryStore;

  constructor(store?: GraphMemoryStore) {
    this._store = store;
  }

  get events(): readonly ReplayEvent[] {
    return Object.freeze([...this._events]);
  }

  get lastEventId(): string | undefined {
    return this._lastEventId;
  }

  record(type: string, payload: Record<string, unknown>, sourceType: string, sourceId: string): ReplayEvent {
    const provenance = createProvenanceRecord({
      sourceId, sourceType: sourceType as never,
      fingerprint: generateMemoryId('evt'),
      parentId: this._lastEventId,
    });

    const event: ReplayEvent = Object.freeze({
      id: provenance.id,
      type, payload, timestamp: Date.now(),
      provenanceId: provenance.id,
      parentId: this._lastEventId,
    });

    this._events.push(event);
    this._lastEventId = event.id;

    if (this._store) {
      this._store.storeProvenance(provenance);
      this._store.storeRecord(
        createMemoryRecord({
          category: 'session' as never,
          payload: { type, payload, eventId: event.id },
          provenanceId: provenance.id,
        }),
      );
    }

    return event;
  }

  clear(): void {
    this._events.length = 0;
    this._lastEventId = undefined;
  }

  get eventCount(): number {
    return this._events.length;
  }
}
