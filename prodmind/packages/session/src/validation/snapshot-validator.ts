import type { SnapshotType } from '../types/index.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';
import { computeDeterministicHash } from '../utils/index.ts';

const VALID_SNAPSHOT_TYPES: SnapshotType[] = ['FULL', 'INCREMENTAL', 'DIFF_ONLY', 'CHECKPOINT'];

export interface SnapshotValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChainValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  versionGaps: number[];
  duplicateVersions: number[];
}

export class SnapshotValidator {
  public validateSnapshot(snapshot: ReasoningSnapshotData): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.id) {
      errors.push('Snapshot ID is required');
    }

    if (!snapshot.sessionId) {
      errors.push('Session ID is required');
    }

    if (snapshot.version === undefined || snapshot.version === null) {
      errors.push('Snapshot version is required');
    } else if (typeof snapshot.version !== 'number' || snapshot.version < 1) {
      errors.push('Snapshot version must be a positive number');
    }

    if (snapshot.snapshotType && !VALID_SNAPSHOT_TYPES.includes(snapshot.snapshotType)) {
      errors.push(`Invalid snapshot type: ${snapshot.snapshotType}. Must be one of: ${VALID_SNAPSHOT_TYPES.join(', ')}`);
    }

    if (!snapshot.stateHash) {
      warnings.push('Snapshot has no state hash');
    }

    if (snapshot.createdAt) {
      const createdDate = new Date(snapshot.createdAt).getTime();
      if (isNaN(createdDate)) {
        errors.push('Created at is not a valid ISO date string');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateSnapshotChain(chain: ReasoningSnapshotData[]): ChainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const versionGaps: number[] = [];
    const duplicateVersions: number[] = [];

    if (chain.length === 0) {
      return { valid: true, errors, warnings, versionGaps, duplicateVersions };
    }

    const ordered = [...chain].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));

    const sessionIds = new Set(ordered.map((s) => s.sessionId));
    if (sessionIds.size > 1) {
      errors.push('Chain contains snapshots from multiple sessions');
    }

    for (let i = 0; i < ordered.length; i++) {
      const snap = ordered[i];
      if (!snap) continue;
      if (snap.previousSnapshotId) {
        const prevExists = ordered.some((s) => s.id === snap.previousSnapshotId);
        if (!prevExists) {
          warnings.push(`Snapshot ${snap.id} references non-existent previous snapshot: ${snap.previousSnapshotId}`);
        }
      }
    }

    const versionCount = new Map<number, number>();
    for (const snap of ordered) {
      const v = snap.version ?? 0;
      versionCount.set(v, (versionCount.get(v) ?? 0) + 1);
    }

    for (const [version, count] of versionCount) {
      if (count > 1) {
        duplicateVersions.push(version);
      }
    }

    if (duplicateVersions.length > 0) {
      errors.push(`Duplicate versions found: ${duplicateVersions.join(', ')}`);
    }

    const minVersion = ordered[0]?.version ?? 0;
    const maxVersion = ordered[ordered.length - 1]?.version ?? 0;

    for (let v = minVersion; v <= maxVersion; v++) {
      if (!versionCount.has(v)) {
        versionGaps.push(v);
      }
    }

    if (versionGaps.length > 0) {
      warnings.push(`Version gaps found: ${versionGaps.join(', ')}`);
    }

    return { valid: errors.length === 0, errors, warnings, versionGaps, duplicateVersions };
  }

  public validateSnapshotVersioning(snapshots: ReasoningSnapshotData[]): ChainValidationResult {
    return this.validateSnapshotChain(snapshots);
  }

  public validateStateHash(snapshot: ReasoningSnapshotData): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.stateHash) {
      errors.push('Snapshot has no state hash to validate');
      return { valid: false, errors, warnings };
    }

    const stateData: Record<string, unknown> = {
      id: snapshot.id,
      sessionId: snapshot.sessionId,
      version: snapshot.version,
      snapshotType: snapshot.snapshotType,
      previousSnapshotId: snapshot.previousSnapshotId,
      currentHypothesis: snapshot.currentHypothesis,
      timelineCursor: snapshot.timelineCursor,
      interactionCursor: snapshot.interactionCursor,
      graphReferences: snapshot.graphReferences,
      compressedContext: snapshot.compressedContext,
    };

    const computedHash = computeDeterministicHash(stateData);

    if (computedHash !== snapshot.stateHash) {
      errors.push(`State hash mismatch: expected ${computedHash}, got ${snapshot.stateHash}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public validateFingerprint(snapshot: ReasoningSnapshotData): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.fingerprintHash) {
      errors.push('Snapshot has no fingerprint hash to validate');
      return { valid: false, errors, warnings };
    }

    const fingerprintData: Record<string, unknown> = {
      id: snapshot.id,
      sessionId: snapshot.sessionId,
      version: snapshot.version,
      snapshotType: snapshot.snapshotType,
      previousSnapshotId: snapshot.previousSnapshotId,
      currentHypothesis: snapshot.currentHypothesis,
      timelineCursor: snapshot.timelineCursor,
      interactionCursor: snapshot.interactionCursor,
      graphReferences: snapshot.graphReferences,
      compressedContext: snapshot.compressedContext,
      metadataJson: snapshot.metadataJson,
      createdAt: snapshot.createdAt,
    };

    const computedFingerprint = computeDeterministicHash(fingerprintData);

    if (computedFingerprint !== snapshot.fingerprintHash) {
      errors.push(`Fingerprint hash mismatch: expected ${computedFingerprint}, got ${snapshot.fingerprintHash}`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
