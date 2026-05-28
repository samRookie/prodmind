import type { TimelineEventType } from '../types/index.ts';
import { TimelineError } from '../errors/index.ts';
import { paginate } from '../utils/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';

export interface TimelineEventFilter {
  types?: TimelineEventType[];
  dateFrom?: string;
  dateTo?: string;
  correlationId?: string;
  causationId?: string;
}

export interface EventTypeDistribution {
  eventType: TimelineEventType;
  count: number;
  percentage: number;
}

export interface HeatmapEntry {
  interval: string;
  count: number;
}

export class TimelineQueryEngine {
  private readonly events: TimelineEvent[];

  public constructor(events: TimelineEvent[] = []) {
    this.events = events;
  }

  public findEventsBySession(sessionId: string, filter?: TimelineEventFilter, page: number = 1, pageSize: number = 50): ReturnType<typeof paginate<TimelineEvent>> {
    if (!sessionId) {
      throw new TimelineError('Session ID is required', { sessionId });
    }

    let results = this.events.filter((e) => e.sessionId === sessionId);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findEventsByType(sessionId: string, eventType: TimelineEventType, filter?: TimelineEventFilter, page: number = 1, pageSize: number = 50): ReturnType<typeof paginate<TimelineEvent>> {
    if (!sessionId) {
      throw new TimelineError('Session ID is required', { sessionId });
    }
    if (!eventType) {
      throw new TimelineError('Event type is required', { eventType });
    }

    let results = this.events.filter((e) => e.sessionId === sessionId && e.eventType === eventType);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findEventsByDateRange(sessionId: string, from: string, to: string, page: number = 1, pageSize: number = 50): ReturnType<typeof paginate<TimelineEvent>> {
    if (!sessionId) {
      throw new TimelineError('Session ID is required', { sessionId });
    }
    if (!from || !to) {
      throw new TimelineError('From and to dates are required', { from, to });
    }

    const fromDate = new Date(from).getTime();
    const toDate = new Date(to).getTime();

    if (isNaN(fromDate) || isNaN(toDate)) {
      throw new TimelineError('Invalid date format', { from, to });
    }

    if (fromDate > toDate) {
      throw new TimelineError('From date must be before to date', { from, to });
    }

    const results = this.events.filter((e) => {
      if (e.sessionId !== sessionId) return false;
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime >= fromDate && eventTime <= toDate;
    });

    return paginate(results, page, pageSize);
  }

  public findEventsByCorrelationId(correlationId: string, page: number = 1, pageSize: number = 50): ReturnType<typeof paginate<TimelineEvent>> {
    if (!correlationId) {
      throw new TimelineError('Correlation ID is required', { correlationId });
    }

    const results = this.events.filter((e) => e.correlationId === correlationId);
    return paginate(results, page, pageSize);
  }

  public findEventsByCausationId(causationId: string, page: number = 1, pageSize: number = 50): ReturnType<typeof paginate<TimelineEvent>> {
    if (!causationId) {
      throw new TimelineError('Causation ID is required', { causationId });
    }

    const results = this.events.filter((e) => e.causationId === causationId);
    return paginate(results, page, pageSize);
  }

  public getEventTypeDistribution(sessionId: string): EventTypeDistribution[] {
    if (!sessionId) {
      throw new TimelineError('Session ID is required', { sessionId });
    }

    const sessionEvents = this.events.filter((e) => e.sessionId === sessionId);
    const total = sessionEvents.length;

    if (total === 0) return [];

    const counts = new Map<TimelineEventType, number>();
    for (const event of sessionEvents) {
      counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
    }

    const distribution: EventTypeDistribution[] = [];
    for (const [eventType, count] of counts) {
      distribution.push({
        eventType,
        count,
        percentage: Math.round((count / total) * 10000) / 100,
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }

  public getTimelineHeatmap(sessionId: string, interval: 'hour' | 'day' | 'week' | 'month' = 'day'): HeatmapEntry[] {
    if (!sessionId) {
      throw new TimelineError('Session ID is required', { sessionId });
    }

    const sessionEvents = this.events.filter((e) => e.sessionId === sessionId);

    if (sessionEvents.length === 0) return [];

    const intervalCounts = new Map<string, number>();

    for (const event of sessionEvents) {
      const date = new Date(event.timestamp);
      let key: string;

      switch (interval) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }

      intervalCounts.set(key, (intervalCounts.get(key) ?? 0) + 1);
    }

    const heatmap: HeatmapEntry[] = [];
    for (const [intervalKey, count] of intervalCounts) {
      heatmap.push({ interval: intervalKey, count });
    }

    return heatmap.sort((a, b) => a.interval.localeCompare(b.interval));
  }

  private applyFilter(events: TimelineEvent[], filter: TimelineEventFilter): TimelineEvent[] {
    return events.filter((e) => {
      if (filter.types && filter.types.length > 0 && !filter.types.includes(e.eventType)) {
        return false;
      }
      if (filter.dateFrom && e.timestamp < filter.dateFrom) return false;
      if (filter.dateTo && e.timestamp > filter.dateTo) return false;
      if (filter.correlationId && e.correlationId !== filter.correlationId) return false;
      if (filter.causationId && e.causationId !== filter.causationId) return false;
      return true;
    });
  }
}
