import type { SnapshotType } from '../types/index.ts';
import { SnapshotError } from '../errors/index.ts';
import { paginate } from '../utils/index.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';

export interface SnapshotFilter {
  types?: SnapshotType[];
  dateFrom?: string;
  dateTo?: string;
  stateHash?: string;
  fingerprint?: string;
  minVersion?: number;
  maxVersion?: number;
}

export interface SnapshotStats {
  totalSnapshots: number;
  latestVersion: number;
  typeDistribution: Record<string, number>;
  versionsWithGaps: boolean;
  gapCount: number;
}

export class SnapshotQueryEngine {
  private readonly snapshots: ReasoningSnapshotData[];

  public constructor(snapshots: ReasoningSnapshotData[] = []) {
    this.snapshots = snapshots;
  }

  public findSnapshotsBySession(sessionId: string, filter?: SnapshotFilter, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<ReasoningSnapshotData>> {
    if (!sessionId) {
      throw new SnapshotError('Session ID is required', { sessionId });
    }

    let results = this.snapshots.filter((s) => s.sessionId === sessionId);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSnapshotsByType(sessionId: string, type: SnapshotType, filter?: SnapshotFilter, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<ReasoningSnapshotData>> {
    if (!sessionId) {
      throw new SnapshotError('Session ID is required', { sessionId });
    }
    if (!type) {
      throw new SnapshotError('Snapshot type is required', { type });
    }

    let results = this.snapshots.filter((s) => s.sessionId === sessionId && s.snapshotType === type);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSnapshotsByStateHash(stateHash: string, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<ReasoningSnapshotData>> {
    if (!stateHash) {
      throw new SnapshotError('State hash is required', { stateHash });
    }

    const results = this.snapshots.filter((s) => s.stateHash === stateHash);
    return paginate(results, page, pageSize);
  }

  public findSnapshotsByFingerprint(fingerprint: string, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<ReasoningSnapshotData>> {
    if (!fingerprint) {
      throw new SnapshotError('Fingerprint is required', { fingerprint });
    }

    const results = this.snapshots.filter((s) => s.fingerprintHash === fingerprint);
    return paginate(results, page, pageSize);
  }

  public findSnapshotsByDateRange(sessionId: string, from: string, to: string, page: number = 1, pageSize: number = 20): ReturnType<typeof paginate<ReasoningSnapshotData>> {
    if (!sessionId) {
      throw new SnapshotError('Session ID is required', { sessionId });
    }
    if (!from || !to) {
      throw new SnapshotError('From and to dates are required', { from, to });
    }

    const fromDate = new Date(from).getTime();
    const toDate = new Date(to).getTime();

    if (isNaN(fromDate) || isNaN(toDate)) {
      throw new SnapshotError('Invalid date format', { from, to });
    }

    if (fromDate > toDate) {
      throw new SnapshotError('From date must be before to date', { from, to });
    }

    const results = this.snapshots.filter((s) => {
      if (s.sessionId !== sessionId) return false;
      const createdAt = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      return createdAt >= fromDate && createdAt <= toDate;
    });

    return paginate(results, page, pageSize);
  }

  public getSnapshotVersionHistory(sessionId: string): ReasoningSnapshotData[] {
    if (!sessionId) {
      throw new SnapshotError('Session ID is required', { sessionId });
    }

    return this.snapshots
      .filter((s) => s.sessionId === sessionId)
      .sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
  }

  public getSnapshotStats(sessionId: string): SnapshotStats {
    if (!sessionId) {
      throw new SnapshotError('Session ID is required', { sessionId });
    }

    const sessionSnapshots = this.snapshots
      .filter((s) => s.sessionId === sessionId)
      .sort((a, b) => (a.version ?? 0) - (b.version ?? 0));

    const typeDistribution: Record<string, number> = {};
    for (const snap of sessionSnapshots) {
      const type = snap.snapshotType ?? 'FULL';
      typeDistribution[type] = (typeDistribution[type] ?? 0) + 1;
    }

    const versions = sessionSnapshots.map((s) => s.version ?? 0);
    let gapCount = 0;
    if (versions.length > 1) {
      for (let i = 1; i < versions.length; i++) {
        const curr = versions[i]!;
        const prev = versions[i - 1]!;
        if (curr - prev > 1) {
          gapCount += curr - prev - 1;
        }
      }
    }

    return {
      totalSnapshots: sessionSnapshots.length,
      latestVersion: sessionSnapshots.length > 0 ? versions[versions.length - 1]! : 0,
      typeDistribution,
      versionsWithGaps: gapCount > 0,
      gapCount,
    };
  }

  private applyFilter(snapshots: ReasoningSnapshotData[], filter: SnapshotFilter): ReasoningSnapshotData[] {
    return snapshots.filter((s) => {
      if (filter.types && filter.types.length > 0 && !filter.types.includes(s.snapshotType ?? 'FULL')) {
        return false;
      }
      if (filter.dateFrom && s.createdAt && s.createdAt < filter.dateFrom) return false;
      if (filter.dateTo && s.createdAt && s.createdAt > filter.dateTo) return false;
      if (filter.stateHash && s.stateHash !== filter.stateHash) return false;
      if (filter.fingerprint && s.fingerprintHash !== filter.fingerprint) return false;
      if (filter.minVersion !== undefined && (s.version ?? 0) < filter.minVersion) return false;
      if (filter.maxVersion !== undefined && (s.version ?? 0) > filter.maxVersion) return false;
      return true;
    });
  }
}
