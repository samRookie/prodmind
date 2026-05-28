import { computeDeterministicHash } from '../utils/index.ts';

export interface RestorationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class RestorationValidator {
  public validateRestorationRequest(sessionId: string, targetState: Record<string, unknown>): RestorationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sessionId) {
      errors.push('Session ID is required');
    }
    if (!targetState || Object.keys(targetState).length === 0) {
      errors.push('Target state must not be empty');
    }
    if (targetState.id && targetState.id !== sessionId) {
      warnings.push('Target state ID conflicts with session ID');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateRestorationState(session: { id: string; status?: string; stateHash?: string }, snapshot: { id: string; stateHash?: string }): RestorationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.id) {
      errors.push('Snapshot ID is required');
    }
    if (session.status === 'FAILED') {
      errors.push('Cannot restore from a failed session');
    }
    if (session.status === 'ARCHIVED') {
      warnings.push('Session is archived, restoration may require unarchiving first');
    }

    if (session.stateHash && snapshot.stateHash) {
      const sessionHash = computeDeterministicHash({ hash: session.stateHash });
      const snapshotHash = computeDeterministicHash({ hash: snapshot.stateHash });
      if (sessionHash === snapshotHash) {
        warnings.push('Session state already matches snapshot, restoration is a no-op');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validatePostRestoration(session: { id: string; status?: string; updatedAt?: string }): RestorationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!session.id) {
      errors.push('Session ID is required after restoration');
    }
    if (session.status === 'FAILED') {
      errors.push('Session entered failed state after restoration');
    }
    if (!session.updatedAt) {
      warnings.push('Session has no update timestamp after restoration');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public checkRestorationConflicts(sessionId: string, targetState: Record<string, unknown>): string[] {
    const conflicts: string[] = [];

    if (targetState.sessionId && targetState.sessionId !== sessionId) {
      conflicts.push(`Target state references session ${targetState.sessionId}, but restoring to session ${sessionId}`);
    }

    const now = Date.now();
    if (targetState.timestamp && typeof targetState.timestamp === 'string') {
      const targetTime = new Date(targetState.timestamp).getTime();
      if (targetTime > now) {
        conflicts.push('Target state timestamp is in the future');
      }
    }

    return conflicts;
  }
}
