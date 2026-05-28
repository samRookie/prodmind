import { AuditError } from '../errors/index.ts';
import { nowISO, generateCorrelationId } from '../utils/index.ts';

export interface AuditEntry {
  id: string;
  action: string;
  sessionId: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export type AuditExportFormat = 'json' | 'pretty' | 'csv';

export class SessionAuditor {
  private readonly auditTrails: Map<string, AuditEntry[]>;

  public constructor() {
    this.auditTrails = new Map();
  }

  public recordAction(action: string, sessionId: string, details?: Record<string, unknown>): AuditEntry {
    if (!action) {
      throw new AuditError('Action is required', { action });
    }
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const entry: AuditEntry = {
      id: generateCorrelationId(),
      action,
      sessionId,
      timestamp: nowISO(),
      details: details ?? {},
    };

    const trail = this.auditTrails.get(sessionId) ?? [];
    trail.push(entry);
    this.auditTrails.set(sessionId, trail);

    return entry;
  }

  public getAuditTrail(sessionId: string, page: number = 1, pageSize: number = 50): { items: AuditEntry[]; total: number; page: number; pageSize: number; totalPages: number } {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const trail = this.auditTrails.get(sessionId) ?? [];
    const total = trail.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = trail.slice(start, start + pageSize);

    return { items: paged, total, page, pageSize, totalPages };
  }

  public getAuditTrailByAction(action: string, sessionId?: string, page: number = 1, pageSize: number = 50): { items: AuditEntry[]; total: number; page: number; pageSize: number; totalPages: number } {
    if (!action) {
      throw new AuditError('Action is required', { action });
    }

    let results: AuditEntry[] = [];

    if (sessionId) {
      const trail = this.auditTrails.get(sessionId) ?? [];
      results = trail.filter((e) => e.action === action);
    } else {
      for (const trail of this.auditTrails.values()) {
        results.push(...trail.filter((e) => e.action === action));
      }
      results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return { items: results.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  public getAuditTrailByDateRange(from: string, to: string, page: number = 1, pageSize: number = 50): { items: AuditEntry[]; total: number; page: number; pageSize: number; totalPages: number } {
    if (!from || !to) {
      throw new AuditError('From and to dates are required', { from, to });
    }

    const fromDate = new Date(from).getTime();
    const toDate = new Date(to).getTime();

    if (isNaN(fromDate) || isNaN(toDate)) {
      throw new AuditError('Invalid date format', { from, to });
    }

    const results: AuditEntry[] = [];
    for (const trail of this.auditTrails.values()) {
      for (const entry of trail) {
        const entryTime = new Date(entry.timestamp).getTime();
        if (entryTime >= fromDate && entryTime <= toDate) {
          results.push(entry);
        }
      }
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return { items: results.slice(start, start + pageSize), total, page, pageSize, totalPages };
  }

  public exportAuditTrail(sessionId: string, format: AuditExportFormat = 'json'): string {
    if (!sessionId) {
      throw new AuditError('Session ID is required', { sessionId });
    }

    const trail = this.auditTrails.get(sessionId) ?? [];

    switch (format) {
      case 'csv': {
        const headers = ['id', 'action', 'sessionId', 'timestamp', 'details'];
        const rows = trail.map((entry) => [
          entry.id,
          entry.action,
          entry.sessionId,
          entry.timestamp,
          JSON.stringify(entry.details),
        ]);
        const csvRows = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
        return csvRows.join('\n');
      }
      case 'pretty': {
        return JSON.stringify(trail, null, 2);
      }
      case 'json':
      default: {
        return JSON.stringify(trail);
      }
    }
  }

  public clearSession(sessionId: string): void {
    this.auditTrails.delete(sessionId);
  }

  public clearAll(): void {
    this.auditTrails.clear();
  }
}
