import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { TemporalSnapshot } from '../types/index.ts';

export function sequenceSnapshots(snapshots: TemporalSnapshot[]): TemporalSnapshot[] {
  if (snapshots.length === 0) return [];
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  validateSequence(sorted);
  return sorted;
}

function validateSequence(snapshots: TemporalSnapshot[]): void {
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1]!;
    const curr = snapshots[i]!;
    if (new Date(curr.timestamp).getTime() <= new Date(prev.timestamp).getTime()) {
      throw new TemporalError(
        `Snapshot ${curr.id} timestamp not after previous snapshot ${prev.id}`,
        TemporalErrorCode.INVALID_TIMELINE,
        { snapshotId: curr.id, previousId: prev.id },
      );
    }
  }
}

export function findSnapshotAtTime(
  snapshots: TemporalSnapshot[],
  timestamp: string,
): TemporalSnapshot | null {
  const time = new Date(timestamp).getTime();
  const sorted = sequenceSnapshots(snapshots);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (new Date(sorted[i]!.timestamp).getTime() <= time) {
      return sorted[i]!;
    }
  }
  return null;
}
