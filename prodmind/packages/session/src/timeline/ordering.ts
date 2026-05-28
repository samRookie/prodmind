import type { TimelineEvent } from './investigation-timeline.ts';

export interface SequencingGap {
  missingNumber: number;
  position: number;
}

export class EventOrdering {
  public sequenceEvents(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
      if (a.sequenceNumber !== b.sequenceNumber) {
        return a.sequenceNumber - b.sequenceNumber;
      }
      return a.timestamp.localeCompare(b.timestamp);
    });
  }

  public detectGaps(events: TimelineEvent[]): SequencingGap[] {
    if (events.length === 0) return [];

    const sorted = this.sequenceEvents(events);
    const gaps: SequencingGap[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const nxt = sorted[i + 1];
      if (cur !== undefined && nxt !== undefined) {
        if (nxt.sequenceNumber - cur.sequenceNumber > 1) {
          for (let missing = cur.sequenceNumber + 1; missing < nxt.sequenceNumber; missing++) {
            gaps.push({ missingNumber: missing, position: i + (missing - cur.sequenceNumber) });
          }
        }
      }
    }

    return gaps;
  }

  public fillGaps(events: TimelineEvent[]): TimelineEvent[] {
    const sorted = this.sequenceEvents(events);
    const gaps = this.detectGaps(sorted);

    if (gaps.length === 0) return sorted;

    const result: TimelineEvent[] = [...sorted];

    for (const gap of gaps.reverse()) {
      const placeholder: TimelineEvent = {
        id: `gap_${gap.missingNumber}`,
        sessionId: sorted[0]?.sessionId ?? 'unknown',
        eventType: 'LIFECYCLE_RETENTION_APPLIED',
        sequenceNumber: gap.missingNumber,
        timestamp: new Date(0).toISOString(),
        payloadJson: JSON.stringify({ placeholder: true, reason: 'missing_event' }),
      };
      result.splice(gap.position - 1, 0, placeholder);
    }

    return result;
  }

  public reorderByCausality(events: TimelineEvent[]): TimelineEvent[] {
    if (events.length === 0) return [];

    const adjacency = new Map<string, TimelineEvent[]>();
    const idMap = new Map<string, TimelineEvent>();
    const inDegree = new Map<string, number>();

    for (const event of events) {
      idMap.set(event.id, event);
      inDegree.set(event.id, 0);
      adjacency.set(event.id, []);
    }

    for (const event of events) {
      if (event.causationId) {
        const parent = events.find(
          (e) => e.id !== event.id && e.causationId === event.causationId,
        );
        if (parent) {
          adjacency.get(parent.id)?.push(event);
          inDegree.set(event.id, (inDegree.get(event.id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const ordered: TimelineEvent[] = [];
    while (queue.length > 0) {
      queue.sort((a, b) => (idMap.get(a)?.sequenceNumber ?? 0) - (idMap.get(b)?.sequenceNumber ?? 0));
      const current = queue.shift()!;
      ordered.push(idMap.get(current)!);
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDegree = (inDegree.get(neighbor.id) ?? 1) - 1;
        inDegree.set(neighbor.id, newDegree);
        if (newDegree === 0) queue.push(neighbor.id);
      }
    }

    if (ordered.length !== events.length) {
      const remaining = events.filter((e) => !ordered.some((o) => o.id === e.id));
      ordered.push(...remaining.sort((a, b) => a.sequenceNumber - b.sequenceNumber));
    }

    return ordered;
  }

  public validateSequencing(events: TimelineEvent[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (events.length === 0) {
      return { valid: true, issues: [] };
    }

    const sorted = this.sequenceEvents(events);

    const first = sorted[0];
    if (first && first.sequenceNumber !== 1) {
      issues.push(`First sequence number is ${first.sequenceNumber}, expected 1`);
    }

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (current === undefined) continue;
      if (i > 0) {
        const previous = sorted[i - 1];
        if (previous !== undefined && current.sequenceNumber <= previous.sequenceNumber) {
          issues.push(
            `Duplicate or out-of-order sequence ${current.sequenceNumber} at position ${i}`,
          );
        }
      }
    }

    const gaps = this.detectGaps(sorted);
    for (const gap of gaps) {
      issues.push(`Missing sequence number ${gap.missingNumber}`);
    }

    const seenIds = new Set<string>();
    for (const event of sorted) {
      if (seenIds.has(event.id)) {
        issues.push(`Duplicate event ID: ${event.id}`);
      }
      seenIds.add(event.id);
    }

    return { valid: issues.length === 0, issues };
  }
}
