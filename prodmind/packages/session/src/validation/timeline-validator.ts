import type { TimelineEventType } from '../types/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

const VALID_EVENT_TYPES: TimelineEventType[] = [
  'SESSION_CREATED', 'SESSION_ACTIVATED', 'SESSION_PAUSED', 'SESSION_RESUMED',
  'SESSION_COMPLETED', 'SESSION_ARCHIVED', 'SESSION_FAILED',
  'HYPOTHESIS_FORMED', 'HYPOTHESIS_UPDATED', 'HYPOTHESIS_CONFIRMED', 'HYPOTHESIS_REJECTED',
  'SNAPSHOT_CAPTURED', 'SNAPSHOT_RESTORED', 'SNAPSHOT_DIFFED',
  'AI_INTERACTION', 'AI_QUERY', 'AI_RESPONSE',
  'GRAPH_REFERENCE_ADDED', 'GRAPH_REFERENCE_REMOVED',
  'INSIGHT_RECORDED', 'RISK_IDENTIFIED',
  'REPLAY_STARTED', 'REPLAY_COMPLETED', 'REPLAY_FAILED',
  'RESTORATION_STARTED', 'RESTORATION_COMPLETED', 'RESTORATION_FAILED',
  'LIFECYCLE_ARCHIVED', 'LIFECYCLE_EXPIRED', 'LIFECYCLE_RETENTION_APPLIED',
];

export interface TimelineValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AnomalyReport {
  eventId: string;
  type: 'SEQUENCE_ANOMALY' | 'TIMING_ANOMALY' | 'PAYLOAD_ANOMALY' | 'DUPLICATE_ANOMALY' | 'REFERENCE_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export class TimelineValidator {
  public validateTimeline(events: TimelineEvent[]): TimelineValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (events.length === 0) {
      warnings.push('Timeline is empty');
      return { valid: true, errors, warnings };
    }

    const sessionIds = new Set(events.map((e) => e.sessionId));
    if (sessionIds.size > 1) {
      errors.push('Timeline contains events from multiple sessions');
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) continue;

      if (!event.id) {
        errors.push(`Event at index ${i} has no ID`);
      }

      if (!event.eventType) {
        errors.push(`Event ${event.id ?? i} has no event type`);
      } else if (!VALID_EVENT_TYPES.includes(event.eventType)) {
        errors.push(`Event ${event.id} has invalid event type: ${event.eventType}`);
      }

      if (!event.sessionId) {
        errors.push(`Event ${event.id} has no session ID`);
      }

      if (!event.timestamp) {
        errors.push(`Event ${event.id} has no timestamp`);
      } else if (isNaN(new Date(event.timestamp).getTime())) {
        errors.push(`Event ${event.id} has invalid timestamp: ${event.timestamp}`);
      }

      if (event.sequenceNumber === undefined || event.sequenceNumber === null) {
        errors.push(`Event ${event.id} has no sequence number`);
      } else if (typeof event.sequenceNumber !== 'number' || event.sequenceNumber < 1) {
        errors.push(`Event ${event.id} has invalid sequence number: ${event.sequenceNumber}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateEventSequence(events: TimelineEvent[]): TimelineValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (events.length === 0) {
      return { valid: true, errors, warnings };
    }

    const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const first = sorted[0]!;
    if (first.sequenceNumber !== 1) {
      errors.push(`First sequence number is ${first.sequenceNumber}, expected 1`);
    }

    const seenSequences = new Set<number>();
    for (let i = 0; i < sorted.length; i++) {
      const event = sorted[i]!;
      const seq = event.sequenceNumber;

      if (seenSequences.has(seq)) {
        errors.push(`Duplicate sequence number: ${seq} (event: ${event.id})`);
      }
      seenSequences.add(seq);

      if (i > 0) {
        const prev = sorted[i - 1]!.sequenceNumber;
        if (seq - prev > 1) {
          warnings.push(`Sequence gap between ${prev} and ${seq}`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateEventOrdering(events: TimelineEvent[]): TimelineValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (events.length < 2) {
      return { valid: true, errors, warnings };
    }

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1]!;
      const curr = events[i]!;

      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();

      if (currTime < prevTime) {
        warnings.push(
          `Event ${curr.id} (seq: ${curr.sequenceNumber}) has timestamp before event ${prev.id} (seq: ${prev.sequenceNumber}): ${curr.timestamp} < ${prev.timestamp}`,
        );
      }

      if (curr.sequenceNumber < prev.sequenceNumber) {
        errors.push(
          `Event ${curr.id} has sequence number ${curr.sequenceNumber} after ${prev.id} with ${prev.sequenceNumber}`,
        );
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateEventPayload(event: TimelineEvent): TimelineValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (event.payloadJson) {
      try {
        const parsed = JSON.parse(event.payloadJson);
        if (typeof parsed !== 'object' || parsed === null) {
          warnings.push('Event payload is not a JSON object');
        }
      } catch {
        warnings.push('Event payload is not valid JSON');
      }
    }

    if (event.metadataJson) {
      try {
        JSON.parse(event.metadataJson);
      } catch {
        warnings.push('Event metadata is not valid JSON');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public detectAnomalies(events: TimelineEvent[]): AnomalyReport[] {
    const anomalies: AnomalyReport[] = [];

    if (events.length === 0) return anomalies;

    const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const seenIds = new Set<string>();
    for (const event of sorted) {
      if (seenIds.has(event.id)) {
        anomalies.push({
          eventId: event.id,
          type: 'DUPLICATE_ANOMALY',
          severity: 'HIGH',
          description: `Duplicate event ID: ${event.id}`,
        });
      }
      seenIds.add(event.id);
    }

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;

      if (curr.sequenceNumber - prev.sequenceNumber > 5) {
        anomalies.push({
          eventId: curr.id,
          type: 'SEQUENCE_ANOMALY',
          severity: 'MEDIUM',
          description: `Large sequence gap: ${prev.sequenceNumber} -> ${curr.sequenceNumber}`,
        });
      }

      const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (timeDiff < 0) {
        anomalies.push({
          eventId: curr.id,
          type: 'TIMING_ANOMALY',
          severity: 'HIGH',
          description: `Event ${curr.id} has timestamp before event ${prev.id}`,
        });
      }

      if (timeDiff > 86400000 && curr.eventType !== 'LIFECYCLE_RETENTION_APPLIED') {
        anomalies.push({
          eventId: curr.id,
          type: 'TIMING_ANOMALY',
          severity: 'LOW',
          description: `Large time gap between events: ${timeDiff}ms`,
        });
      }
    }

    for (const event of sorted) {
      if (event.payloadJson) {
        try {
          const parsed = JSON.parse(event.payloadJson);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 50) {
            anomalies.push({
              eventId: event.id,
              type: 'PAYLOAD_ANOMALY',
              severity: 'LOW',
              description: `Event ${event.id} has unusually large payload (${Object.keys(parsed).length} keys)`,
            });
          }
        } catch {
          anomalies.push({
            eventId: event.id,
            type: 'PAYLOAD_ANOMALY',
            severity: 'MEDIUM',
            description: `Event ${event.id} has invalid JSON payload`,
          });
        }
      }

      if (event.causationId && !events.some((e) => e.id !== event.id && e.causationId === event.causationId)) {
        anomalies.push({
          eventId: event.id,
          type: 'REFERENCE_ANOMALY',
          severity: 'LOW',
          description: `Event ${event.id} has causation ID with no matching parent event`,
        });
      }
    }

    return anomalies;
  }
}
