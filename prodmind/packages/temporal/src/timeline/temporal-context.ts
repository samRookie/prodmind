import type { TemporalSnapshot } from '../types/index.ts';
import { SnapshotTimeline } from './snapshot-timeline.ts';

export interface TemporalContext {
  timeline: SnapshotTimeline;
  currentSnapshot: TemporalSnapshot | null;
  previousSnapshot: TemporalSnapshot | null;
  snapshotCount: number;
  totalDurationMs: number;
  averageIntervalMs: number;
}

export function buildTemporalContext(snapshots: TemporalSnapshot[]): TemporalContext {
  const timeline = new SnapshotTimeline(snapshots);
  const all = timeline.getAll();
  const currentSnapshot = timeline.getLatest();
  const previousSnapshot = all.length >= 2 ? all[all.length - 2]! : null;
  const totalDurationMs = all.length >= 2
    ? new Date(all[all.length - 1]!.timestamp).getTime() - new Date(all[0]!.timestamp).getTime()
    : 0;
  const averageIntervalMs = all.length >= 2 ? totalDurationMs / (all.length - 1) : 0;
  return {
    timeline,
    currentSnapshot,
    previousSnapshot,
    snapshotCount: all.length,
    totalDurationMs,
    averageIntervalMs,
  };
}
