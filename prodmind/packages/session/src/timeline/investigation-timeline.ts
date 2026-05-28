import type { TimelineEventType } from '../types/index.ts';
import { TimelineError } from '../errors/index.ts';
import { generateTimelineId, nowISO, generateCorrelationId, generateCausationId } from '../utils/index.ts';

export interface TimelineEvent {
  id: string;
  sessionId: string;
  eventType: TimelineEventType;
  payloadJson?: string;
  sequenceNumber: number;
  timestamp: string;
  causationId?: string;
  correlationId?: string;
  metadataJson?: string;
}

export class InvestigationTimeline {
  public readonly sessionId: string;
  public readonly events: TimelineEvent[];
  private nextSeq: number;

  public constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.events = [];
    this.nextSeq = 1;
  }

  public addEvent(
    eventType: TimelineEventType,
    payload?: Record<string, unknown>,
    causationId?: string,
    correlationId?: string,
  ): TimelineEvent {
    if (!eventType) {
      throw new TimelineError('Event type is required', { sessionId: this.sessionId });
    }

    const event: TimelineEvent = {
      id: generateTimelineId(),
      sessionId: this.sessionId,
      eventType,
      payloadJson: payload ? JSON.stringify(payload) : undefined,
      sequenceNumber: this.nextSeq++,
      timestamp: nowISO(),
      causationId: causationId ?? generateCausationId(),
      correlationId: correlationId ?? generateCorrelationId(),
    };

    this.events.push(event);
    return event;
  }

  public getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  public getEventsByType(type: TimelineEventType): TimelineEvent[] {
    return this.events.filter((e) => e.eventType === type);
  }

  public getEventsByDateRange(from: string, to: string): TimelineEvent[] {
    return this.events.filter((e) => e.timestamp >= from && e.timestamp <= to);
  }

  public getLatestEvent(): TimelineEvent | undefined {
    if (this.events.length === 0) return undefined;
    return this.events[this.events.length - 1];
  }

  public getEventCount(): number {
    return this.events.length;
  }

  public clear(): void {
    this.events.length = 0;
    this.nextSeq = 1;
  }

  public toJSON(): { sessionId: string; events: TimelineEvent[]; nextSequenceNumber: number } {
    return {
      sessionId: this.sessionId,
      events: [...this.events],
      nextSequenceNumber: this.nextSeq,
    };
  }

  public static fromJSON(data: { sessionId: string; events: TimelineEvent[]; nextSequenceNumber: number }): InvestigationTimeline {
    const timeline = new InvestigationTimeline(data.sessionId);
    timeline.events.push(...data.events);
    timeline.nextSeq = data.nextSequenceNumber;
    return timeline;
  }
}
