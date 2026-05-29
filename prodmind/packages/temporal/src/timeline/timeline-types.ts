import type { TemporalSnapshot } from '../types/index.ts';

export interface TimelineConfig {
  maxSnapshots: number;
  minIntervalMs: number;
  enableIndexing: boolean;
}

export interface TimelineEntry {
  snapshot: TemporalSnapshot;
  index: number;
  previousFingerprint: string | null;
  delta: {
    nodeDelta: number;
    edgeDelta: number;
    complexityDelta: number;
  };
}

export interface TimelineQuery {
  startTimestamp?: string;
  endTimestamp?: string;
  snapshotIds?: string[];
  limit?: number;
  offset?: number;
}

export interface TimelineIndex {
  snapshotId: string;
  timestamp: string;
  fingerprint: string;
  nodeCount: number;
  edgeCount: number;
  complexityScore: number;
}
