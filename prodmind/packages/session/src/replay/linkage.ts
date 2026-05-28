import { randomBytes } from 'node:crypto';
import type { ReplayLinkType, ReplayLinkStatus } from '../types/index.ts';
import { ReplayError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';
import { SessionReplay } from './session-replay.ts';
import type { SessionReplayData } from './session-replay.ts';

function generateLinkId(): string {
  return `link_${randomBytes(12).toString('hex')}`;
}

export interface ReplayLink {
  id: string;
  sessionId: string;
  snapshotId: string;
  linkType: ReplayLinkType;
  status: ReplayLinkStatus;
  createdAt: string;
  verifiedAt?: string;
  deactivatedAt?: string;
}

export class ReplayLinkageEngine {
  private links: Map<string, ReplayLink> = new Map();

  public createLink(sessionId: string, snapshotId: string, linkType: ReplayLinkType): ReplayLink {
    const link: ReplayLink = {
      id: generateLinkId(),
      sessionId,
      snapshotId,
      linkType,
      status: 'PENDING',
      createdAt: nowISO(),
    };
    this.links.set(link.id, link);
    return link;
  }

  public getLinksBySession(sessionId: string): ReplayLink[] {
    return Array.from(this.links.values()).filter((l) => l.sessionId === sessionId);
  }

  public getLinksByReplay(replayId: string): ReplayLink[] {
    return Array.from(this.links.values()).filter((l) => l.id === replayId);
  }

  public getActiveLink(sessionId: string): ReplayLink | undefined {
    return Array.from(this.links.values()).find(
      (l) => l.sessionId === sessionId && l.status !== 'STALE' && l.status !== 'FAILED',
    );
  }

  public verifyLink(link: ReplayLink): boolean {
    const stored = this.links.get(link.id);
    if (!stored) {
      throw new ReplayError('Link not found', { linkId: link.id });
    }
    const valid = stored.status === 'LINKED' || stored.status === 'VERIFIED';
    if (valid) {
      stored.status = 'VERIFIED';
      stored.verifiedAt = nowISO();
      this.links.set(stored.id, stored);
    }
    return valid;
  }

  public deactivateLink(linkId: string): void {
    const link = this.links.get(linkId);
    if (!link) {
      throw new ReplayError('Link not found', { linkId });
    }
    link.status = 'STALE';
    link.deactivatedAt = nowISO();
    this.links.set(linkId, link);
  }

  public removeLink(linkId: string): void {
    if (!this.links.has(linkId)) {
      throw new ReplayError('Link not found', { linkId });
    }
    this.links.delete(linkId);
  }

  public createFullRestoreLink(sessionId: string, snapshotId: string): ReplayLink {
    return this.createLink(sessionId, snapshotId, 'FULL_RESTORE');
  }

  public createVerificationLink(sessionId: string, snapshotId: string): ReplayLink {
    return this.createLink(sessionId, snapshotId, 'VERIFICATION');
  }

  public static fromReplay(replay: SessionReplay): ReplayLink {
    return {
      id: replay.id,
      sessionId: replay.sessionId,
      snapshotId: replay.snapshotId ?? '',
      linkType: replay.linkType,
      status: replay.status,
      createdAt: replay.createdAt,
      verifiedAt: replay.verifiedAt,
    };
  }

  public static toReplayLinkData(link: ReplayLink): SessionReplayData {
    return {
      sessionId: link.sessionId,
      snapshotId: link.snapshotId,
      linkType: link.linkType,
      status: link.status,
      createdAt: link.createdAt,
      verifiedAt: link.verifiedAt,
    };
  }
}
