export interface DiffStatistics {
  totalPrevious: number;
  totalCurrent: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
}

export interface SnapshotDiffResult {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
  statistics: DiffStatistics;
}
