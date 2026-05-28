import type { TimelineEventType } from '../types/index.ts';
import type { TimelineEvent } from './investigation-timeline.ts';

export interface TimelineFilter {
  types?: TimelineEventType[];
  dateFrom?: string;
  dateTo?: string;
  keywords?: string[];
}

const HYPOTHESIS_EVENT_TYPES: TimelineEventType[] = [
  'HYPOTHESIS_FORMED',
  'HYPOTHESIS_UPDATED',
  'HYPOTHESIS_CONFIRMED',
  'HYPOTHESIS_REJECTED',
];

const SNAPSHOT_EVENT_TYPES: TimelineEventType[] = [
  'SNAPSHOT_CAPTURED',
  'SNAPSHOT_RESTORED',
  'SNAPSHOT_DIFFED',
];

const INTERACTION_EVENT_TYPES: TimelineEventType[] = [
  'AI_INTERACTION',
  'AI_QUERY',
  'AI_RESPONSE',
];

export function queryEvents(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  return events.filter((event) => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(event.eventType)) {
      return false;
    }
    if (filter.dateFrom && event.timestamp < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo && event.timestamp > filter.dateTo) {
      return false;
    }
    if (filter.keywords && filter.keywords.length > 0) {
      const searchText = `${event.eventType} ${event.payloadJson ?? ''} ${event.metadataJson ?? ''}`.toLowerCase();
      const matchesKeyword = filter.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
      if (!matchesKeyword) return false;
    }
    return true;
  });
}

export function getEventTimeline(sessionId: string): { sessionId: string; events: TimelineEvent[] } {
  return { sessionId, events: [] };
}

export function getHypothesisEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter((e) => HYPOTHESIS_EVENT_TYPES.includes(e.eventType));
}

export function getSnapshotEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter((e) => SNAPSHOT_EVENT_TYPES.includes(e.eventType));
}

export function getInteractionEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events.filter((e) => INTERACTION_EVENT_TYPES.includes(e.eventType));
}

export function searchEvents(events: TimelineEvent[], query: string): TimelineEvent[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return events.filter((event) => {
    const searchable = [
      event.eventType,
      event.payloadJson ?? '',
      event.metadataJson ?? '',
      event.id,
      event.causationId ?? '',
      event.correlationId ?? '',
    ].join(' ').toLowerCase();
    return searchable.includes(lowerQuery);
  });
}
