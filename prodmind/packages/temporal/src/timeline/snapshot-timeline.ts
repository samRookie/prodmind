import type { TemporalSnapshot, TemporalWindow } from '../types/index.ts';
import { sequenceSnapshots } from './snapshot-sequencing.ts';
import type { TimelineEntry } from './timeline-types.ts';
import { createTimelineWindow, sliceTimeline } from './timeline-window.ts';

export class SnapshotTimeline {
  private snapshots: TemporalSnapshot[] = [];

  constructor(snapshots?: TemporalSnapshot[]) {
    if (snapshots) {
      this.snapshots = sequenceSnapshots(snapshots);
    }
  }

  addSnapshot(snapshot: TemporalSnapshot): void {
    this.snapshots.push(snapshot);
    this.snapshots = sequenceSnapshots(this.snapshots);
  }

  getAll(): TemporalSnapshot[] {
    return [...this.snapshots];
  }

  getLatest(): TemporalSnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1]!;
  }

  getEarliest(): TemporalSnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[0]!;
  }

  getCount(): number {
    return this.snapshots.length;
  }

  getWindow(startSnapshotId: string, endSnapshotId: string): TemporalWindow {
    return createTimelineWindow(this.snapshots, startSnapshotId, endSnapshotId);
  }

  slice(startTimestamp?: string, endTimestamp?: string, limit?: number): TemporalSnapshot[] {
    return sliceTimeline(this.snapshots, startTimestamp, endTimestamp, limit);
  }

  getSnapshot(id: string): TemporalSnapshot | null {
    return this.snapshots.find((s) => s.id === id) ?? null;
  }

  getEntries(): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    for (let i = 0; i < this.snapshots.length; i++) {
      const snapshot = this.snapshots[i]!;
      const prev = i > 0 ? this.snapshots[i - 1] : null;
      entries.push({
        snapshot,
        index: i,
        previousFingerprint: prev?.fingerprint ?? null,
        delta: {
          nodeDelta: prev ? snapshot.nodeCount - prev.nodeCount : 0,
          edgeDelta: prev ? snapshot.edgeCount - prev.edgeCount : 0,
          complexityDelta: 0,
        },
      });
    }
    return entries;
  }
}
