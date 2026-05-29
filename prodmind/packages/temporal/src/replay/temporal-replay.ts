import { TemporalError, TemporalErrorCode } from '../errors/index.ts';
import type { TemporalSnapshot } from '../types/index.ts';

export interface ReplayResult {
  originalOrder: string[];
  replayedOrder: string[];
  match: boolean;
  fingerprint: string;
}

export function verifyReplayConsistency(
  originalSnapshots: TemporalSnapshot[],
  replayedSnapshots: TemporalSnapshot[],
): ReplayResult {
  if (originalSnapshots.length !== replayedSnapshots.length) {
    throw new TemporalError(
      'Snapshot count mismatch during replay',
      TemporalErrorCode.REPLAY_MISMATCH,
      { original: originalSnapshots.length, replayed: replayedSnapshots.length },
    );
  }
  const originalOrder = originalSnapshots.map((s) => s.id);
  const replayedOrder = replayedSnapshots.map((s) => s.id);
  const match = originalOrder.every((id, i) => id === replayedOrder[i]);
  const fingerprint = `${originalSnapshots.length}-${originalSnapshots[0]?.fingerprint ?? 'none'}-${originalSnapshots[originalSnapshots.length - 1]?.fingerprint ?? 'none'}`;
  if (!match) {
    throw new TemporalError(
      'Replay order mismatch detected',
      TemporalErrorCode.REPLAY_MISMATCH,
      { originalOrder, replayedOrder },
    );
  }
  return { originalOrder, replayedOrder, match, fingerprint };
}
