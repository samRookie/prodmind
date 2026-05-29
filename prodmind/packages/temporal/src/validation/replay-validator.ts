import type { TemporalSnapshot } from '../types/index.ts';

export interface ReplayValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateReplaySnapshots(snapshots: TemporalSnapshot[]): ReplayValidationResult {
  const errors: string[] = [];
  if (snapshots.length === 0) {
    errors.push('No snapshots to replay');
    return { valid: false, errors };
  }
  const ids = new Set<string>();
  for (const s of snapshots) {
    if (!s.id) errors.push('Snapshot missing id');
    if (!s.timestamp) errors.push(`Snapshot ${s.id} missing timestamp`);
    if (!s.fingerprint) errors.push(`Snapshot ${s.id} missing fingerprint`);
    if (ids.has(s.id)) errors.push(`Duplicate snapshot id: ${s.id}`);
    ids.add(s.id);
  }
  const timestamps = snapshots.map((s) => new Date(s.timestamp).getTime());
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i]! < timestamps[i - 1]!) {
      errors.push(`Snapshot ${snapshots[i]!.id} timestamp out of order`);
    }
  }
  return { valid: errors.length === 0, errors };
}
