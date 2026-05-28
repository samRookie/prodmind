import { randomBytes } from 'node:crypto';
import type { ReplayLinkType, ReplayLinkStatus } from '../types/index.ts';
import { ReplayError } from '../errors/index.ts';
import { computeHash, nowISO } from '../utils/index.ts';

export interface SessionReplayData {
  id?: string;
  sessionId: string;
  snapshotId?: string;
  linkType: ReplayLinkType;
  status?: ReplayLinkStatus;
  verificationHash?: string;
  metadataJson?: string;
  restoredFromSnapshotId?: string;
  createdAt?: string;
  linkedAt?: string;
  verifiedAt?: string;
  failureReason?: string;
}

function generateReplayId(): string {
  return `replay_${randomBytes(12).toString('hex')}`;
}

export class SessionReplay {
  public readonly id: string;
  public readonly sessionId: string;
  public snapshotId?: string;
  public linkType: ReplayLinkType;
  public status: ReplayLinkStatus;
  public verificationHash?: string;
  public metadataJson?: string;
  public restoredFromSnapshotId?: string;
  public readonly createdAt: string;
  public linkedAt?: string;
  public verifiedAt?: string;
  public failureReason?: string;

  public constructor(data: SessionReplayData) {
    this.id = data.id ?? generateReplayId();
    this.sessionId = data.sessionId;
    this.snapshotId = data.snapshotId;
    this.linkType = data.linkType;
    this.status = data.status ?? 'PENDING';
    this.verificationHash = data.verificationHash;
    this.metadataJson = data.metadataJson;
    this.restoredFromSnapshotId = data.restoredFromSnapshotId;
    this.createdAt = data.createdAt ?? nowISO();
    this.linkedAt = data.linkedAt;
    this.verifiedAt = data.verifiedAt;
    this.failureReason = data.failureReason;
  }

  public link(snapshot: { id: string; stateHash?: string }, linkType: ReplayLinkType): void {
    this.snapshotId = snapshot.id;
    this.linkType = linkType;
    this.status = 'LINKED';
    this.linkedAt = nowISO();
    if (snapshot.stateHash) {
      this.verificationHash = computeHash(snapshot.stateHash);
    }
  }

  public verify(): boolean {
    if (!this.verificationHash || !this.snapshotId) {
      throw new ReplayError('Cannot verify replay: missing verification hash or snapshot', {
        replayId: this.id,
      });
    }
    const valid = this.verificationHash.length > 0;
    if (valid) {
      this.status = 'VERIFIED';
      this.verifiedAt = nowISO();
    }
    return valid;
  }

  public unlink(): void {
    this.snapshotId = undefined;
    this.status = 'STALE';
    this.verificationHash = undefined;
    this.linkedAt = undefined;
  }

  public markAsVerified(): void {
    this.status = 'VERIFIED';
    this.verifiedAt = nowISO();
  }

  public markAsFailed(reason: string): void {
    this.status = 'FAILED';
    this.failureReason = reason;
  }

  public toJSON(): SessionReplayData {
    return {
      id: this.id,
      sessionId: this.sessionId,
      snapshotId: this.snapshotId,
      linkType: this.linkType,
      status: this.status,
      verificationHash: this.verificationHash,
      metadataJson: this.metadataJson,
      restoredFromSnapshotId: this.restoredFromSnapshotId,
      createdAt: this.createdAt,
      linkedAt: this.linkedAt,
      verifiedAt: this.verifiedAt,
      failureReason: this.failureReason,
    };
  }

  public static fromJSON(data: SessionReplayData): SessionReplay {
    return new SessionReplay(data);
  }
}
