import { randomBytes } from 'node:crypto';
import { nowISO } from '../utils/index.ts';

export type LifecycleEventType =
  | 'SESSION_CREATED'
  | 'SESSION_ACTIVATED'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'SESSION_COMPLETED'
  | 'SESSION_ARCHIVED'
  | 'SESSION_FAILED'
  | 'SESSION_DELETED'
  | 'SESSION_EXPIRED'
  | 'SESSION_RETENTION_APPLIED';

export interface LifecycleEvent {
  id: string;
  type: LifecycleEventType;
  sessionId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export type LifecycleEventHandler = (event: LifecycleEvent) => void;

function generateEventId(): string {
  return `evt_${randomBytes(12).toString('hex')}`;
}

export class LifecycleEventBus {
  private handlers: Map<LifecycleEventType, Set<LifecycleEventHandler>> = new Map();
  private history: LifecycleEvent[] = [];
  private maxHistory: number = 1000;

  public emit(event: Omit<LifecycleEvent, 'id' | 'timestamp'>): LifecycleEvent {
    const fullEvent: LifecycleEvent = {
      ...event,
      id: generateEventId(),
      timestamp: nowISO(),
    };

    this.history.push(fullEvent);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(fullEvent);
        } catch {
          // Silently handle handler errors
        }
      }
    }

    return fullEvent;
  }

  public on(eventType: LifecycleEventType, handler: LifecycleEventHandler): void {
    const existing = this.handlers.get(eventType) ?? new Set();
    existing.add(handler);
    this.handlers.set(eventType, existing);
  }

  public off(eventType: LifecycleEventType, handler: LifecycleEventHandler): void {
    const existing = this.handlers.get(eventType);
    if (existing) {
      existing.delete(handler);
      if (existing.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  public once(eventType: LifecycleEventType, handler: LifecycleEventHandler): void {
    const wrappedHandler: LifecycleEventHandler = (event) => {
      this.off(eventType, wrappedHandler);
      handler(event);
    };
    this.on(eventType, wrappedHandler);
  }

  public getEventHistory(eventType?: LifecycleEventType): LifecycleEvent[] {
    if (eventType) {
      return this.history.filter((e) => e.type === eventType);
    }
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}
