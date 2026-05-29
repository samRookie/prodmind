import type { EvolutionPoint,TemporalSnapshot } from '../types/index.ts';

export interface IntegrityValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateTemporalIntegrity(
  snapshots: TemporalSnapshot[],
  evolutionPoints: EvolutionPoint[],
): IntegrityValidationResult {
  const issues: string[] = [];
  const snapshotIds = new Set(snapshots.map((s) => s.id));
  for (const ep of evolutionPoints) {
    if (!snapshotIds.has(ep.snapshotId)) {
      issues.push(`EvolutionPoint references missing snapshot: ${ep.snapshotId}`);
    }
  }
  const evolutionSnapshotIds = new Set(evolutionPoints.map((ep) => ep.snapshotId));
  for (const s of snapshots) {
    if (!evolutionSnapshotIds.has(s.id)) {
      issues.push(`Snapshot ${s.id} has no corresponding EvolutionPoint`);
    }
  }
  for (let i = 1; i < snapshots.length; i++) {
    const prev = new Date(snapshots[i - 1]!.timestamp).getTime();
    const curr = new Date(snapshots[i]!.timestamp).getTime();
    if (curr <= prev) {
      issues.push(`Snapshot ${snapshots[i]!.id} timestamp not strictly increasing`);
    }
  }
  for (let i = 1; i < evolutionPoints.length; i++) {
    const prev = new Date(evolutionPoints[i - 1]!.timestamp).getTime();
    const curr = new Date(evolutionPoints[i]!.timestamp).getTime();
    if (curr < prev) {
      issues.push(`EvolutionPoint ${evolutionPoints[i]!.snapshotId} timestamp out of order`);
    }
  }
  return { valid: issues.length === 0, issues };
}
