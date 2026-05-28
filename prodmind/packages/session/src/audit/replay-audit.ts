import { createHash } from 'node:crypto';
import { AuditError } from '../errors/index.ts';
import { nowISO, generateCorrelationId } from '../utils/index.ts';

export interface ReplayAuditEntry {
  id: string;
  replayId: string;
  sessionId: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  timestamp: string;
  details: Record<string, unknown>;
}

export interface ReplayAuditSummary {
  sessionId: string;
  totalReplays: number;
  successfulReplays: number;
  failedReplays: number;
  partialReplays: number;
  successRate: number;
  lastReplayTimestamp: string;
}

export class ReplayAuditor {
  private readonly auditEntries: Map<string, ReplayAuditEntry[]>;

  public constructor() {
    this.auditEntries = new Map();
  }

  public auditReplayOperation(replayId: string, sessionId: string, outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL', details?: Record<string, unknown>): ReplayAuditEntry {
    if (!replayId) {
      throw new AuditError('Replay ID is required', { replayId });
    }
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }
    if (!outcome) {
      throw new AuditError('Outcome is required', { outcome });
    }
    if (!['SUCCESS', 'FAILURE', 'PARTIAL'].includes(outcome)) {
      throw new AuditError(`Invalid outcome: ${outcome}. Must be SUCCESS, FAILURE, or PARTIAL`, { outcome });
    }

    const entry: ReplayAuditEntry = {
      id: generateCorrelationId(),
      replayId,
      sessionId,
      outcome,
      timestamp: nowISO(),
      details: details ?? {},
    };

    const existing = this.auditEntries.get(sessionId) ?? [];
    existing.push(entry);
    this.auditEntries.set(sessionId, existing);

    return entry;
  }

  public getReplayAuditTrail(sessionId: string, page: number = 1, pageSize: number = 50): { items: ReplayAuditEntry[]; total: number; page: number; pageSize: number; totalPages: number } {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const entries = this.auditEntries.get(sessionId) ?? [];
    const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return { items: sorted.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  public getReplayAuditSummary(sessionId: string): ReplayAuditSummary {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const entries = this.auditEntries.get(sessionId) ?? [];
    const successful = entries.filter((e) => e.outcome === 'SUCCESS').length;
    const failed = entries.filter((e) => e.outcome === 'FAILURE').length;
    const partial = entries.filter((e) => e.outcome === 'PARTIAL').length;

    const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    return {
      sessionId,
      totalReplays: entries.length,
      successfulReplays: successful,
      failedReplays: failed,
      partialReplays: partial,
      successRate: entries.length > 0 ? successful / entries.length : 0,
      lastReplayTimestamp: sorted[0]?.timestamp ?? '',
    };
  }

  public verifyReplayAuditTrail(sessionId: string): { valid: boolean; issues: string[]; integrityHash: string } {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const issues: string[] = [];
    const entries = this.auditEntries.get(sessionId) ?? [];

    if (entries.length === 0) {
      issues.push('No replay audit entries found for this session');
    }

    const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i]!;
      const prev = sorted[i - 1]!;
      if (curr.timestamp < prev.timestamp) {
        issues.push(`Timestamp ordering violation: ${curr.id} has timestamp ${curr.timestamp} after ${prev.id} with ${prev.timestamp}`);
      }
    }

    const seenReplayIds = new Set<string>();
    for (const entry of sorted) {
      if (seenReplayIds.has(entry.replayId)) {
        issues.push(`Duplicate replay audit entry for replay: ${entry.replayId}`);
      }
      seenReplayIds.add(entry.replayId);
    }

    const integrityData = sorted.map((e) => `${e.id}:${e.outcome}:${e.timestamp}`).join('|');
    const integrityHash = createHash('sha256').update(integrityData).digest('hex');

    return { valid: issues.length === 0, issues, integrityHash };
  }

  public clearSession(sessionId: string): void {
    this.auditEntries.delete(sessionId);
  }
}
