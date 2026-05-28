import { randomBytes } from 'node:crypto';
import { LifecycleError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';
import type { SessionStatus } from '../types/index.ts';

export interface ArchiveRecord {
  id: string;
  sessionId: string;
  projectId?: string;
  originalStatus: SessionStatus;
  archivedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ArchiveStats {
  totalArchived: number;
  totalPurged: number;
  oldestArchive?: string;
  newestArchive?: string;
}

function generateArchiveId(): string {
  return `arch_${randomBytes(12).toString('hex')}`;
}

export class SessionArchiver {
  private archives: Map<string, ArchiveRecord> = new Map();

  public archive(sessionId: string, metadata?: Record<string, unknown>): ArchiveRecord {
    const existing = Array.from(this.archives.values()).find((a) => a.sessionId === sessionId);
    if (existing) {
      return existing;
    }

    const record: ArchiveRecord = {
      id: generateArchiveId(),
      sessionId,
      originalStatus: 'COMPLETED',
      archivedAt: nowISO(),
      metadata,
    };

    this.archives.set(record.id, record);
    return record;
  }

  public unarchive(sessionId: string): ArchiveRecord {
    const record = Array.from(this.archives.values()).find((a) => a.sessionId === sessionId);
    if (!record) {
      throw new LifecycleError('Session not found in archive', { sessionId });
    }
    this.archives.delete(record.id);
    return record;
  }

  public getArchivedSessions(projectId?: string): ArchiveRecord[] {
    const all = Array.from(this.archives.values());
    if (projectId) {
      return all.filter((a) => a.projectId === projectId);
    }
    return all;
  }

  public purgeArchived(beforeDate: Date): ArchiveRecord[] {
    const purged: ArchiveRecord[] = [];
    for (const [id, record] of this.archives) {
      const archiveDate = new Date(record.archivedAt);
      if (archiveDate < beforeDate) {
        this.archives.delete(id);
        purged.push(record);
      }
    }
    return purged;
  }

  public getArchiveStats(): ArchiveStats {
    const all = Array.from(this.archives.values());
    const timestamps = all.map((a) => a.archivedAt).sort();

    return {
      totalArchived: all.length,
      totalPurged: 0,
      oldestArchive: timestamps.length > 0 ? timestamps[0] : undefined,
      newestArchive: timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined,
    };
  }
}
