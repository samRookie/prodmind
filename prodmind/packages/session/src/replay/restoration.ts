import { RestorationError } from '../errors/index.ts';
import { computeDeterministicHash, nowISO } from '../utils/index.ts';
import type { ReplayLinkType, RestorationStatus, ReplayLinkStatus } from '../types/index.ts';

export interface RestorableState {
  sessionId: string;
  snapshotId: string;
  stateHash: string;
  restoredAt: string;
  status: RestorationStatus;
}

export interface RestorationDiff {
  sourceHash: string;
  targetHash: string;
  changedKeys: string[];
  additions: string[];
  removals: string[];
}

export class ReplayRestorationEngine {
  private restoreHistory: Map<string, RestorableState> = new Map();

  public restoreFromSnapshot(session: { id: string; stateHash?: string }, snapshot: { id: string; stateHash?: string }): RestorableState {
    const snapshotStateHash = snapshot.stateHash ?? computeDeterministicHash({ snapshotId: snapshot.id });

    const restored: RestorableState = {
      sessionId: session.id,
      snapshotId: snapshot.id,
      stateHash: snapshotStateHash,
      restoredAt: nowISO(),
      status: 'COMPLETED',
    };

    this.restoreHistory.set(session.id, restored);
    return restored;
  }

  public restoreFromLink(replayLink: {
    sessionId: string;
    snapshotId?: string;
    status: ReplayLinkStatus;
    linkType: ReplayLinkType;
  }): RestorableState {
    if (replayLink.status !== 'LINKED' && replayLink.status !== 'VERIFIED') {
      throw new RestorationError('Cannot restore from unverified link', {
        sessionId: replayLink.sessionId,
        linkStatus: replayLink.status,
      });
    }

    const snapshotId = replayLink.snapshotId;
    if (!snapshotId) {
      throw new RestorationError('Replay link has no snapshot reference', {
        sessionId: replayLink.sessionId,
      });
    }

    const restored: RestorableState = {
      sessionId: replayLink.sessionId,
      snapshotId,
      stateHash: computeDeterministicHash({
        sessionId: replayLink.sessionId,
        snapshotId,
        linkType: replayLink.linkType,
      }),
      restoredAt: nowISO(),
      status: 'COMPLETED',
    };

    this.restoreHistory.set(replayLink.sessionId, restored);
    return restored;
  }

  public getRestorableState(sessionId: string): RestorableState | undefined {
    return this.restoreHistory.get(sessionId);
  }

  public computeRestorationDiff(session: { id: string; stateHash?: string }, snapshot: { id: string; stateHash?: string }): RestorationDiff {
    const sourceHash = session.stateHash ?? computeDeterministicHash({ sessionId: session.id });
    const targetHash = snapshot.stateHash ?? computeDeterministicHash({ snapshotId: snapshot.id });

    const changedKeys: string[] = [];
    const additions: string[] = [];
    const removals: string[] = [];

    if (sourceHash !== targetHash) {
      changedKeys.push('state');
      additions.push('snapshot_' + snapshot.id);
      removals.push('current_state');
    }

    return {
      sourceHash,
      targetHash,
      changedKeys,
      additions,
      removals,
    };
  }

  public validateRestoreTarget(session: { id: string; status?: string }, snapshot: { id: string }): boolean {
    if (session.status === 'FAILED' || session.status === 'ARCHIVED') {
      return false;
    }
    if (!snapshot.id) {
      return false;
    }
    return true;
  }

}
