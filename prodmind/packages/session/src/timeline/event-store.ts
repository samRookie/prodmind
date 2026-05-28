import type { TimelineEventType } from '../types/index.ts';
import type { TimelineEvent } from './investigation-timeline.ts';

export class EventStore {
  private readonly storage: Map<string, TimelineEvent[]>;

  public constructor() {
    this.storage = new Map();
  }

  public store(sessionId: string, event: TimelineEvent): void {
    const existing = this.storage.get(sessionId) ?? [];
    existing.push(event);
    this.storage.set(sessionId, existing);
  }

  public storeBatch(sessionId: string, events: TimelineEvent[]): void {
    const existing = this.storage.get(sessionId) ?? [];
    existing.push(...events);
    this.storage.set(sessionId, existing);
  }

  public getBySessionId(sessionId: string): TimelineEvent[] {
    return this.storage.get(sessionId) ?? [];
  }

  public getByEventType(sessionId: string, type: TimelineEventType): TimelineEvent[] {
    const events = this.storage.get(sessionId);
    if (!events) return [];
    return events.filter((e) => e.eventType === type);
  }

  public getBySequenceRange(sessionId: string, start: number, end: number): TimelineEvent[] {
    const events = this.storage.get(sessionId);
    if (!events) return [];
    return events.filter((e) => e.sequenceNumber >= start && e.sequenceNumber <= end);
  }

  public getLatestSequenceNumber(sessionId: string): number {
    const events = this.storage.get(sessionId);
    if (!events || events.length === 0) return 0;
    return Math.max(...events.map((e) => e.sequenceNumber));
  }

  public deleteBySessionId(sessionId: string): void {
    this.storage.delete(sessionId);
  }

  public getAllSessions(): string[] {
    return Array.from(this.storage.keys());
  }
}
