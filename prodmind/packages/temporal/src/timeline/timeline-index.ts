import type { TemporalSnapshot } from '../types/index.ts';
import type { TimelineIndex } from './timeline-types.ts';

export function buildTimelineIndex(snapshots: TemporalSnapshot[]): TimelineIndex[] {
  return snapshots.map((s) => ({
    snapshotId: s.id,
    timestamp: s.timestamp,
    fingerprint: s.fingerprint,
    nodeCount: s.nodeCount,
    edgeCount: s.edgeCount,
    complexityScore: s.nodeCount + s.edgeCount * 0.5,
  }));
}

export function findSnapshotsByFingerprint(
  index: TimelineIndex[],
  fingerprint: string,
): TimelineIndex[] {
  return index.filter((e) => e.fingerprint === fingerprint);
}

export function getSnapshotRange(
  index: TimelineIndex[],
  startTimestamp: string,
  endTimestamp: string,
): TimelineIndex[] {
  const start = new Date(startTimestamp).getTime();
  const end = new Date(endTimestamp).getTime();
  return index.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= start && t <= end;
  });
}
