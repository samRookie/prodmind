export type AuditEventType =
  | 'provider_execution'
  | 'governance_violation'
  | 'replay_event'
  | 'retry_escalation'
  | 'failure_recovery';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface AuditSummary {
  totalEvents: number;
  byType: Record<string, number>;
  timeRange: { start: number; end: number } | null;
}

let eventCounter = 0;

function generateId(): string {
  return `audit-${Date.now()}-${++eventCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export class AuditTrailRecorder {
  private events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, 'id'>): void {
    const newEvent: AuditEvent = {
      ...event,
      id: generateId(),
    };
    this.events.push(newEvent);
  }

  getEvents(operationId?: string): readonly AuditEvent[] {
    if (operationId === undefined) {
      return Object.freeze([...this.events]);
    }
    return Object.freeze(
      this.events.filter((e) => {
        const opId = e.details['operationId'] as string | undefined;
        return opId === operationId;
      }),
    );
  }

  getEventsByType(eventType: string): readonly AuditEvent[] {
    return Object.freeze(
      this.events.filter((e) => e.eventType === eventType),
    );
  }

  getEventsInRange(startMs: number, endMs: number): readonly AuditEvent[] {
    return Object.freeze(
      this.events.filter((e) => e.timestamp >= startMs && e.timestamp <= endMs),
    );
  }

  getSummary(): AuditSummary {
    const byType: Record<string, number> = {};
    let minTs = Infinity;
    let maxTs = -Infinity;

    for (const event of this.events) {
      byType[event.eventType] = (byType[event.eventType] ?? 0) + 1;
      if (event.timestamp < minTs) minTs = event.timestamp;
      if (event.timestamp > maxTs) maxTs = event.timestamp;
    }

    const timeRange: AuditSummary['timeRange'] =
      this.events.length === 0
        ? null
        : { start: minTs, end: maxTs };

    return {
      totalEvents: this.events.length,
      byType,
      timeRange,
    };
  }

  clear(): void {
    this.events = [];
  }
}
