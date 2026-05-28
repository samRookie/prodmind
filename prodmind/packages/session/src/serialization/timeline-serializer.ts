import { SerializationError } from '../errors/index.ts';
import { DeterministicSerializer } from './deterministic-serializer.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

export type TimelineExportFormat = 'json' | 'compact' | 'pretty';

const serializer = new DeterministicSerializer();

export function serializeTimeline(events: TimelineEvent[]): string {
  try {
    const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return serializer.serialize(sorted);
  } catch (cause) {
    throw new SerializationError('Failed to serialize timeline', { eventCount: events.length, cause });
  }
}

export function deserializeTimeline(json: string): TimelineEvent[] {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty timeline JSON');
  }
  try {
    return serializer.deserialize<TimelineEvent[]>(json);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize timeline', { cause });
  }
}

export function serializeTimelineBatch(events: TimelineEvent[]): string {
  try {
    const batch = events.map((e, index) => ({
      ...e,
      batchIndex: index,
    }));
    return serializer.serialize(batch);
  } catch (cause) {
    throw new SerializationError('Failed to serialize timeline batch', { eventCount: events.length, cause });
  }
}

export function deserializeTimelineBatch(json: string): TimelineEvent[] {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty timeline batch JSON');
  }
  try {
    const batch = serializer.deserialize<Array<TimelineEvent & { batchIndex: number }>>(json);
    return batch
      .sort((a, b) => a.batchIndex - b.batchIndex)
      .map(({ batchIndex: _, ...event }) => event);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize timeline batch', { cause });
  }
}

export function exportTimeline(events: TimelineEvent[], format: TimelineExportFormat = 'json'): string {
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  switch (format) {
    case 'compact': {
      const compact = sorted.map((e) => ({
        id: e.id,
        seq: e.sequenceNumber,
        type: e.eventType,
        ts: e.timestamp,
        cid: e.correlationId,
        payload: safeJsonParse(e.payloadJson),
      }));
      return JSON.stringify(compact);
    }
    case 'pretty': {
      const pretty = sorted.map((e) => ({
        id: e.id,
        sequenceNumber: e.sequenceNumber,
        eventType: e.eventType,
        timestamp: e.timestamp,
        correlationId: e.correlationId,
        causationId: e.causationId,
        payload: safeJsonParse(e.payloadJson),
        metadata: safeJsonParse(e.metadataJson),
      }));
      return JSON.stringify(pretty, null, 2);
    }
    case 'json':
    default: {
      return serializeTimeline(sorted);
    }
  }
}

function safeJsonParse(json?: string | null): unknown {
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}
