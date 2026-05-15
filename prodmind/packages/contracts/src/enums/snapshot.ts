export enum SnapshotStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  EXTRACTING = 'EXTRACTING',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  DEGRADED = 'DEGRADED',
}

export function canTransitionTo(
  current: SnapshotStatus,
  next: SnapshotStatus,
): boolean {
  if (current === SnapshotStatus.ACTIVE) return false;

  const allowed: Record<SnapshotStatus, SnapshotStatus[]> = {
    [SnapshotStatus.PENDING]: [SnapshotStatus.UPLOADING, SnapshotStatus.FAILED],
    [SnapshotStatus.UPLOADING]: [SnapshotStatus.EXTRACTING, SnapshotStatus.FAILED],
    [SnapshotStatus.EXTRACTING]: [SnapshotStatus.PARSING, SnapshotStatus.FAILED],
    [SnapshotStatus.PARSING]: [SnapshotStatus.ANALYZING, SnapshotStatus.FAILED],
    [SnapshotStatus.ANALYZING]: [SnapshotStatus.ACTIVE, SnapshotStatus.DEGRADED, SnapshotStatus.FAILED],
    [SnapshotStatus.ACTIVE]: [],
    [SnapshotStatus.FAILED]: [SnapshotStatus.PENDING],
    [SnapshotStatus.DEGRADED]: [SnapshotStatus.FAILED],
  };

  return allowed[current]?.includes(next) ?? false;
}
