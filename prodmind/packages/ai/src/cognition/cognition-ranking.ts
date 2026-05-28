import type { CognitionSnapshot } from './cognition-types.ts';

export function rankSnapshots(snapshots: CognitionSnapshot[]): CognitionSnapshot[] {
  return [...snapshots].sort((a, b) => {
    const byHealth = a.healthScore.overall - b.healthScore.overall;
    if (byHealth !== 0) return byHealth;
    return a.fingerprint.localeCompare(b.fingerprint);
  });
}

export function selectMostCritical(snapshots: CognitionSnapshot[], count: number): CognitionSnapshot[] {
  return rankSnapshots(snapshots).slice(0, count);
}
