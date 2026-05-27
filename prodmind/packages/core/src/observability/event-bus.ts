export interface BusEvent {
  readonly id: string;
  readonly eventType: string;
  readonly timestamp: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface BusEventSchema {
  eventType: string;
  payload: Record<string, unknown>;
}

interface InternalBusEvent {
  id: string;
  eventType: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

let counter = 0;

function generateId(): string {
  counter++;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export class StructuredEventBus {
  private events: InternalBusEvent[] = [];
  private readonly maxRetention: number;
  private readonly subscribers = new Map<string, Set<(event: BusEvent) => void>>();
  private readonly allSubscribers = new Set<(event: BusEvent) => void>();

  constructor(maxRetention = 10000) {
    this.maxRetention = maxRetention;
  }

  publish(eventType: string, payload: Record<string, unknown>): BusEvent {
    const event: InternalBusEvent = {
      id: generateId(),
      eventType,
      timestamp: Date.now(),
      payload: { ...payload },
    };

    this.events.push(event);

    if (this.events.length > this.maxRetention) {
      this.events.splice(0, this.events.length - this.maxRetention);
    }

    const frozenEvent: BusEvent = Object.freeze({ ...event, payload: Object.freeze({ ...event.payload }) });

    const typeHandlers = this.subscribers.get(eventType);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(frozenEvent);
        } catch {
          // swallow handler errors
        }
      }
    }

    for (const handler of this.allSubscribers) {
      try {
        handler(frozenEvent);
      } catch {
        // swallow handler errors
      }
    }

    return frozenEvent;
  }

  subscribe(eventType: string, handler: (event: BusEvent) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);

    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }

  subscribeAll(handler: (event: BusEvent) => void): () => void {
    this.allSubscribers.add(handler);

    return () => {
      this.allSubscribers.delete(handler);
    };
  }

  getEvents(eventType?: string, limit?: number): readonly BusEvent[] {
    let filtered = eventType
      ? this.events.filter((e) => e.eventType === eventType)
      : [...this.events];

    if (limit !== undefined && limit >= 0) {
      filtered = filtered.slice(-limit);
    }

    return filtered.map((e) =>
      Object.freeze({ ...e, payload: Object.freeze({ ...e.payload }) }),
    );
  }

  getEventCount(): number {
    return this.events.length;
  }

  clear(olderThanMs?: number): number {
    if (olderThanMs === undefined) {
      const count = this.events.length;
      this.events = [];
      return count;
    }

    const cutoff = Date.now() - olderThanMs;
    const beforeCount = this.events.length;
    this.events = this.events.filter((e) => e.timestamp >= cutoff);
    return beforeCount - this.events.length;
  }
}
