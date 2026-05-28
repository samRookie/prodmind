import type { ReplayLinkType, ReplayLinkStatus } from '../types/index.ts';
import { computeDeterministicHash } from '../utils/index.ts';

export interface ReplayLinkValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ReplayValidator {
  public validateReplayLink(link: {
    id?: string;
    sessionId?: string;
    snapshotId?: string;
    linkType?: ReplayLinkType;
    status?: ReplayLinkStatus;
  }): ReplayLinkValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!link.sessionId) {
      errors.push('Link missing sessionId');
    }
    if (!link.snapshotId) {
      errors.push('Link missing snapshotId');
    }
    if (!link.linkType) {
      errors.push('Link missing linkType');
    } else {
      const validTypes: ReplayLinkType[] = ['FULL_RESTORE', 'STATE_SYNC', 'PARTIAL_RESTORE', 'VERIFICATION'];
      if (!validTypes.includes(link.linkType)) {
        errors.push(`Invalid linkType: ${link.linkType}`);
      }
    }
    if (!link.status) {
      warnings.push('Link has no status, assuming PENDING');
    } else {
      const validStatuses: ReplayLinkStatus[] = ['PENDING', 'LINKED', 'VERIFIED', 'FAILED', 'STALE'];
      if (!validStatuses.includes(link.status)) {
        errors.push(`Invalid status: ${link.status}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateReplayIntegrity(session: { id: string; stateHash?: string }, snapshot: { id: string; stateHash?: string }): boolean {
    if (!session.stateHash || !snapshot.stateHash) {
      return false;
    }
    const sessionHash = computeDeterministicHash({ sessionId: session.id, hash: session.stateHash });
    const snapshotHash = computeDeterministicHash({ snapshotId: snapshot.id, hash: snapshot.stateHash });
    return sessionHash.length > 0 && snapshotHash.length > 0;
  }

  public validateReplayChain(links: Array<{ id: string; sessionId: string; snapshotId?: string; status: ReplayLinkStatus; linkType: ReplayLinkType; createdAt: string }>): ReplayLinkValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (links.length === 0) {
      errors.push('Replay chain is empty');
      return { valid: false, errors, warnings };
    }

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (link && !link.snapshotId) {
        errors.push(`Link ${link.id} at position ${i} has no snapshot reference`);
      }
      if (link && link.status === 'FAILED') {
        warnings.push(`Link ${link.id} at position ${i} is failed`);
      }
    }

    const sessionIds = new Set(links.map((l) => l.sessionId));
    if (sessionIds.size > 1) {
      errors.push('Replay chain contains links from multiple sessions');
    }

    const timestamps = links.map((l) => new Date(l.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      const prevTimestamp = timestamps[i - 1];
      const currTimestamp = timestamps[i];
      if (prevTimestamp !== undefined && currTimestamp !== undefined && currTimestamp < prevTimestamp) {
        const link = links[i];
        if (link) {
          errors.push(`Link ${link.id} at position ${i} is out of chronological order`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateRestorationPoint(session: { id: string; status?: string }, snapshot: { id: string }): ReplayLinkValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.id) {
      errors.push('Snapshot ID is required for restoration point');
    }

    if (session.status === 'FAILED') {
      errors.push('Cannot restore from a failed session');
    }
    if (session.status === 'ARCHIVED') {
      warnings.push('Restoring from an archived session may have stale state');
    }
    if (!session.status || session.status === 'CREATED') {
      warnings.push('Session has not been activated, restoration may be premature');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
