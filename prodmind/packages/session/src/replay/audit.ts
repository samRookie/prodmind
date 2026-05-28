import { randomBytes } from 'node:crypto';
import { nowISO } from '../utils/index.ts';

export type AuditAction = 'LINK_CREATED' | 'LINK_VERIFIED' | 'LINK_FAILED' | 'RESTORATION_STARTED' | 'RESTORATION_COMPLETED' | 'RESTORATION_FAILED';

export interface AuditEntry {
  id: string;
  sessionId: string;
  action: AuditAction;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface ReplayHistorySummary {
  sessionId: string;
  totalLinks: number;
  verifiedLinks: number;
  failedLinks: number;
  restorations: number;
  lastReplayAt?: string;
  auditEntries: AuditEntry[];
}

function generateAuditId(): string {
  return `audit_${randomBytes(12).toString('hex')}`;
}

export class ReplayAudit {
  private entries: AuditEntry[] = [];

  public recordLinkCreation(link: { id: string; sessionId: string; snapshotId?: string; linkType: string }): AuditEntry {
    const entry: AuditEntry = {
      id: generateAuditId(),
      sessionId: link.sessionId,
      action: 'LINK_CREATED',
      details: {
        linkId: link.id,
        snapshotId: link.snapshotId,
        linkType: link.linkType,
      },
      timestamp: nowISO(),
    };
    this.entries.push(entry);
    return entry;
  }

  public recordLinkVerification(link: { id: string; sessionId: string }, result: boolean): AuditEntry {
    const entry: AuditEntry = {
      id: generateAuditId(),
      sessionId: link.sessionId,
      action: result ? 'LINK_VERIFIED' : 'LINK_FAILED',
      details: {
        linkId: link.id,
        result,
      },
      timestamp: nowISO(),
    };
    this.entries.push(entry);
    return entry;
  }

  public recordRestoration(sessionId: string, snapshotId: string, outcome: 'COMPLETED' | 'FAILED'): AuditEntry {
    const action: AuditAction = outcome === 'COMPLETED' ? 'RESTORATION_COMPLETED' : 'RESTORATION_FAILED';
    const entry: AuditEntry = {
      id: generateAuditId(),
      sessionId,
      action,
      details: {
        snapshotId,
        outcome,
      },
      timestamp: nowISO(),
    };
    this.entries.push(entry);
    return entry;
  }

  public getAuditTrail(sessionId: string): AuditEntry[] {
    return this.entries.filter((e) => e.sessionId === sessionId);
  }

  public getReplayHistory(sessionId: string): ReplayHistorySummary {
    const sessionEntries = this.getAuditTrail(sessionId);
    const linkCreated = sessionEntries.filter((e) => e.action === 'LINK_CREATED');
    const linkVerified = sessionEntries.filter((e) => e.action === 'LINK_VERIFIED');
    const linkFailed = sessionEntries.filter((e) => e.action === 'LINK_FAILED');
    const restorations = sessionEntries.filter((e) => e.action === 'RESTORATION_COMPLETED');

    const lastEntry = sessionEntries[sessionEntries.length - 1];
    const lastReplay = lastEntry ? lastEntry.timestamp : undefined;

    return {
      sessionId,
      totalLinks: linkCreated.length,
      verifiedLinks: linkVerified.length,
      failedLinks: linkFailed.length,
      restorations: restorations.length,
      lastReplayAt: lastReplay,
      auditEntries: sessionEntries,
    };
  }
}
