import { randomBytes } from 'node:crypto';
import { RestorationError } from '../errors/index.ts';
import { computeDeterministicHash, nowISO } from '../utils/index.ts';
import type { RestorationStatus } from '../types/index.ts';

export interface RestorationCandidate {
  snapshotId: string;
  createdAt: string;
  estimatedCost: number;
  stateHash: string;
}

export interface RestorationCost {
  estimatedMs: number;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  operations: number;
}

function generateRestoreId(): string {
  return `restore_${randomBytes(12).toString('hex')}`;
}

export class SessionRestorer {
  private restoreHistory: Map<string, { id: string; targetState: string; status: RestorationStatus; restoredAt: string }> = new Map();

  public restore(sessionId: string, targetState: Record<string, unknown>): { id: string; status: RestorationStatus } {
    const id = generateRestoreId();
    const stateHash = computeDeterministicHash(targetState);

    this.restoreHistory.set(sessionId, {
      id,
      targetState: stateHash,
      status: 'COMPLETED',
      restoredAt: nowISO(),
    });

    return { id, status: 'COMPLETED' };
  }

  public restoreFromSnapshot(sessionId: string, snapshotId: string): { id: string; status: RestorationStatus } {
    const id = generateRestoreId();
    const targetState = computeDeterministicHash({ sessionId, snapshotId });

    this.restoreHistory.set(sessionId, {
      id,
      targetState,
      status: 'COMPLETED',
      restoredAt: nowISO(),
    });

    return { id, status: 'COMPLETED' };
  }

  public restoreLatest(sessionId: string): { id: string; status: RestorationStatus } {
    const existing = this.restoreHistory.get(sessionId);
    if (!existing) {
      throw new RestorationError('No previous restoration state available for session', { sessionId });
    }

    const id = generateRestoreId();
    this.restoreHistory.set(sessionId, {
      id,
      targetState: existing.targetState,
      status: 'COMPLETED',
      restoredAt: nowISO(),
    });

    return { id, status: 'COMPLETED' };
  }

  public getRestorationCandidates(sessionId: string): RestorationCandidate[] {
    const existing = this.restoreHistory.get(sessionId);
    if (!existing) {
      return [];
    }

    return [
      {
        snapshotId: existing.id,
        createdAt: existing.restoredAt,
        estimatedCost: 1,
        stateHash: existing.targetState,
      },
    ];
  }

  public estimateRestorationCost(_sessionId: string, targetState: Record<string, unknown>): RestorationCost {
    const keyCount = Object.keys(targetState).length;
    const operations = keyCount + 1;

    let complexity: 'LOW' | 'MEDIUM' | 'HIGH';
    if (keyCount <= 5) {
      complexity = 'LOW';
    } else if (keyCount <= 15) {
      complexity = 'MEDIUM';
    } else {
      complexity = 'HIGH';
    }

    return {
      estimatedMs: operations * 50,
      complexity,
      operations,
    };
  }
}
