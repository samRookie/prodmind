import type { TimelineEventType } from '../types/index.ts';
import type { TimelineEvent } from './investigation-timeline.ts';

export interface TimelineStats {
  totalEvents: number;
  eventTypeCounts: Partial<Record<TimelineEventType, number>>;
  timeRange: { from: string; to: string } | null;
  averageIntervalMs: number | null;
  hypothesisEvents: number;
  snapshotEvents: number;
  interactionEvents: number;
  gaps: number;
}

function eventsAreRedundant(a: TimelineEvent, b: TimelineEvent): boolean {
  if (a.eventType !== b.eventType) return false;
  if (a.sessionId !== b.sessionId) return false;
  return a.causationId === b.causationId;
}

export function compressTimeline(events: TimelineEvent[]): TimelineEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const compressed: TimelineEvent[] = [];

  for (const event of sorted) {
    const last = compressed[compressed.length - 1];
    if (last && eventsAreRedundant(last, event)) {
      last.payloadJson = event.payloadJson ?? last.payloadJson;
      last.timestamp = event.timestamp;
      last.metadataJson = event.metadataJson ?? last.metadataJson;
    } else {
      compressed.push({ ...event });
    }
  }

  return compressed;
}

export function decompressTimeline(compressed: TimelineEvent[]): TimelineEvent[] {
  return [...compressed].map((e) => ({ ...e }));
}

export function summarizeTimeline(events: TimelineEvent[]): string {
  const stats = getTimelineStats(events);
  const parts: string[] = [
    `Total events: ${stats.totalEvents}`,
  ];

  for (const [type, count] of Object.entries(stats.eventTypeCounts)) {
    if (count > 0) {
      parts.push(`${type}: ${count}`);
    }
  }

  if (stats.timeRange) {
    parts.push(`From: ${stats.timeRange.from}`);
    parts.push(`To: ${stats.timeRange.to}`);
  }

  if (stats.averageIntervalMs !== null) {
    parts.push(`Avg interval: ${Math.round(stats.averageIntervalMs)}ms`);
  }

  parts.push(`Hypothesis events: ${stats.hypothesisEvents}`);
  parts.push(`Snapshot events: ${stats.snapshotEvents}`);
  parts.push(`Interaction events: ${stats.interactionEvents}`);

  if (stats.gaps > 0) {
    parts.push(`Gaps: ${stats.gaps}`);
  }

  return parts.join(' | ');
}

export function getTimelineStats(events: TimelineEvent[]): TimelineStats {
  const eventTypeCounts: Partial<Record<TimelineEventType, number>> = {};

  for (const event of events) {
    eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] ?? 0) + 1;
  }

  const timestamps = events.map((e) => e.timestamp).sort();
  const firstTs = timestamps[0];
  const lastTs = timestamps[timestamps.length - 1];
  const timeRange: { from: string; to: string } | null =
    timestamps.length >= 2 && firstTs !== undefined && lastTs !== undefined
      ? { from: firstTs, to: lastTs }
      : null;

  let averageIntervalMs: number | null = null;
  if (timestamps.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const prev = timestamps[i - 1];
      const curr = timestamps[i];
      if (prev !== undefined && curr !== undefined) {
        intervals.push(new Date(curr).getTime() - new Date(prev).getTime());
      }
    }
    if (intervals.length > 0) {
      averageIntervalMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    }
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

  const sorted = [...events].sort((a, b) => Math.abs(a.sequenceNumber) - Math.abs(b.sequenceNumber));
  let gaps = 0;
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    if (curr !== undefined && prev !== undefined && curr.sequenceNumber - prev.sequenceNumber > 1) {
      gaps += curr.sequenceNumber - prev.sequenceNumber - 1;
    }
  }

  return {
    totalEvents: events.length,
    eventTypeCounts,
    timeRange,
    averageIntervalMs,
    hypothesisEvents: events.filter((e) => HYPOTHESIS_EVENT_TYPES.includes(e.eventType)).length,
    snapshotEvents: events.filter((e) => SNAPSHOT_EVENT_TYPES.includes(e.eventType)).length,
    interactionEvents: events.filter((e) => INTERACTION_EVENT_TYPES.includes(e.eventType)).length,
    gaps,
  };
}
