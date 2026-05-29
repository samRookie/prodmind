import type { TemporalSnapshot } from '../types/index.ts';
import type { TimelineQuery } from './timeline-types.ts';

export function queryTimeline(
  snapshots: TemporalSnapshot[],
  query: TimelineQuery,
): TemporalSnapshot[] {
  let results = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (query.startTimestamp) {
    const start = new Date(query.startTimestamp).getTime();
    results = results.filter((s) => new Date(s.timestamp).getTime() >= start);
  }
  if (query.endTimestamp) {
    const end = new Date(query.endTimestamp).getTime();
    results = results.filter((s) => new Date(s.timestamp).getTime() <= end);
  }
  if (query.snapshotIds && query.snapshotIds.length > 0) {
    const idSet = new Set(query.snapshotIds);
    results = results.filter((s) => idSet.has(s.id));
  }
  if (query.offset) {
    results = results.slice(query.offset);
  }
  if (query.limit) {
    results = results.slice(0, query.limit);
  }
  return results;
}
