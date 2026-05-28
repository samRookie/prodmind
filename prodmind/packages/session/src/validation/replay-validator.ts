import { computeHash } from '../utils/index.ts';
import type { SessionReplayData } from '../replay/session-replay.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';
import type { SessionSummary } from '../types/index.ts';

const VALID_LINK_TYPES = ['FULL_RESTORE', 'STATE_SYNC', 'PARTIAL_RESTORE', 'VERIFICATION'];
const VALID_LINK_STATUSES = ['PENDING', 'LINKED', 'VERIFIED', 'FAILED', 'STALE'];

export interface ReplayValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReplayIntegrityResult {
  valid: boolean;
  stateMatch: boolean;
  hashConsistent: boolean;
  snapshotExists: boolean;
  errors: string[];
}

export class ReplayValidator {
  public validateReplayLink(link: SessionReplayData): ReplayValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!link.id) {
      errors.push('Replay link ID is required');
    }

    if (!link.sessionId) {
      errors.push('Session ID is required');
    }

    if (!link.linkType) {
      errors.push('Link type is required');
    } else if (!VALID_LINK_TYPES.includes(link.linkType)) {
      errors.push(`Invalid link type: ${link.linkType}. Must be one of: ${VALID_LINK_TYPES.join(', ')}`);
    }

    if (link.status && !VALID_LINK_STATUSES.includes(link.status)) {
      warnings.push(`Invalid link status: ${link.status}. Must be one of: ${VALID_LINK_STATUSES.join(', ')}`);
    }

    if (!link.snapshotId) {
      warnings.push('Replay link has no associated snapshot');
    }

    if (link.createdAt) {
      const createdDate = new Date(link.createdAt).getTime();
      if (isNaN(createdDate)) {
        errors.push('Created at is not a valid ISO date string');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateReplayIntegrity(
    session: SessionSummary,
    snapshot: ReasoningSnapshotData,
    link: SessionReplayData,
  ): ReplayIntegrityResult {
    const errors: string[] = [];
    const stateMatch = session.id === snapshot.sessionId;
    const snapshotExists = !!snapshot.id;
    const hashConsistent = this.verifyHashConsistency(session, snapshot, link);

    if (!stateMatch) {
      errors.push(`Session ID mismatch: session=${session.id}, snapshot=${snapshot.sessionId}`);
    }

    if (!snapshotExists) {
      errors.push('Snapshot does not exist');
    }

    if (!hashConsistent) {
      errors.push('Verification hash is inconsistent with snapshot state');
    }

    return {
      valid: errors.length === 0,
      stateMatch,
      hashConsistent,
      snapshotExists,
      errors,
    };
  }

  public validateReplayChain(links: SessionReplayData[]): ReplayValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (links.length === 0) {
      warnings.push('Replay chain is empty');
      return { valid: true, errors, warnings };
    }

    const sorted = [...links].sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
    );

    const sessionIds = new Set(sorted.map((l) => l.sessionId));
    if (sessionIds.size > 1) {
      errors.push('Replay chain contains links from multiple sessions');
    }

    for (let i = 0; i < sorted.length; i++) {
      const link = sorted[i];
      if (!link) continue;
      const validation = this.validateReplayLink(link);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;

      const prevTime = new Date(prev.createdAt ?? 0).getTime();
      const currTime = new Date(curr.createdAt ?? 0).getTime();

      if (currTime < prevTime) {
        warnings.push(`Link ${curr.id} has createdAt before previous link ${prev.id}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateReplayState(
    session: SessionSummary,
    snapshot: ReasoningSnapshotData,
  ): ReplayValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (session.id !== snapshot.sessionId) {
      errors.push(`Session ID mismatch: ${session.id} vs ${snapshot.sessionId}`);
    }

    if (!snapshot.stateHash) {
      warnings.push('Snapshot has no state hash for verification');
    }

    if (session.status === 'FAILED') {
      warnings.push('Session is in FAILED state, replay may not be reliable');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private verifyHashConsistency(
    _session: SessionSummary,
    snapshot: ReasoningSnapshotData,
    link: SessionReplayData,
  ): boolean {
    if (!link.verificationHash || !snapshot.stateHash) {
      return false;
    }
    const expectedHash = computeHash(snapshot.stateHash);
    return link.verificationHash === expectedHash;
  }
}
