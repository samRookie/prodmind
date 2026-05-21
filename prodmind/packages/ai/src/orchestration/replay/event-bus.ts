import type { ExecutionEvent, ExecutionEventType } from '../contracts/execution-contracts.ts';

export type EventSubscriber = (event: ExecutionEvent) => void;

export class EventBus {
  private subscribers: Map<ExecutionEventType, EventSubscriber[]> = new Map();
  private history: ExecutionEvent[] = [];

  subscribe(type: ExecutionEventType, handler: EventSubscriber): () => void {
    const subs = this.subscribers.get(type) ?? [];
    subs.push(handler);
    this.subscribers.set(type, subs);
    return () => {
      const idx = subs.indexOf(handler);
      if (idx !== -1) subs.splice(idx, 1);
    };
  }

  subscribeAll(handler: EventSubscriber): () => void {
    const unsubs = EXECUTION_EVENT_TYPES.map(t => this.subscribe(t, handler));
    return () => unsubs.forEach(u => u());
  }

  emit(event: ExecutionEvent): void {
    this.history.push(event);
    const subs = this.subscribers.get(event.type);
    if (subs) {
      for (const handler of subs) {
        handler(event);
      }
    }
  }

  getHistory(): readonly ExecutionEvent[] {
    return Object.freeze([...this.history]);
  }

  clear(): void {
    this.history = [];
    this.subscribers.clear();
  }
}

const EXECUTION_EVENT_TYPES: readonly ExecutionEventType[] = Object.freeze([
  'scheduled', 'started', 'completed', 'failed', 'cancelled', 'replayed',
]);
