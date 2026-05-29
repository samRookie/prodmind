import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { TemporalSnapshot, TemporalWindow } from '../types/index.ts';

export function createTimelineWindow(
  snapshots: TemporalSnapshot[],
  startSnapshotId: string,
  endSnapshotId: string,
): TemporalWindow {
  const start = snapshots.find((s) => s.id === startSnapshotId);
  const end = snapshots.find((s) => s.id === endSnapshotId);
  if (!start) throw new TemporalError(`Snapshot ${startSnapshotId} not found`, TemporalErrorCode.SNAPSHOT_NOT_FOUND);
  if (!end) throw new TemporalError(`Snapshot ${endSnapshotId} not found`, TemporalErrorCode.SNAPSHOT_NOT_FOUND);
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const startIdx = sorted.findIndex((s) => s.id === startSnapshotId);
  const endIdx = sorted.findIndex((s) => s.id === endSnapshotId);
  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    throw new TemporalError('Invalid window: start after end', TemporalErrorCode.INVALID_TIMELINE);
  }
  const windowSnapshots = sorted.slice(startIdx, endIdx + 1);
  return {
    startSnapshotId,
    endSnapshotId,
    startTimestamp: start.timestamp,
    endTimestamp: end.timestamp,
    snapshotCount: windowSnapshots.length,
    intervalMs: new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime(),
  };
}

export function sliceTimeline(
  snapshots: TemporalSnapshot[],
  startTimestamp?: string,
  endTimestamp?: string,
  limit?: number,
): TemporalSnapshot[] {
  let filtered = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (startTimestamp) {
    const startTime = new Date(startTimestamp).getTime();
    filtered = filtered.filter((s) => new Date(s.timestamp).getTime() >= startTime);
  }
  if (endTimestamp) {
    const endTime = new Date(endTimestamp).getTime();
    filtered = filtered.filter((s) => new Date(s.timestamp).getTime() <= endTime);
  }
  if (limit && limit > 0) {
    filtered = filtered.slice(-limit);
  }
  return filtered;
}
