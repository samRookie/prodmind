import { randomBytes } from 'node:crypto';
import { nowISO, computeDeterministicHash } from '../utils/index.ts';

export interface VersionRecord {
  id: string;
  sessionId: string;
  snapshotId: string;
  version: number;
  createdAt: string;
  stateHash: string;
}

function generateVersionId(): string {
  return `ver_${randomBytes(12).toString('hex')}`;
}

export class VersionReference {
  private versions: Map<string, VersionRecord[]> = new Map();

  public createVersion(sessionId: string, snapshotId: string, version?: number): VersionRecord {
    const sessionVersions = this.versions.get(sessionId) ?? [];
    const nextVersion = version ?? this.getNextVersion(sessionVersions);

    const record: VersionRecord = {
      id: generateVersionId(),
      sessionId,
      snapshotId,
      version: nextVersion,
      createdAt: nowISO(),
      stateHash: computeDeterministicHash({ sessionId, snapshotId, version: nextVersion }),
    };

    sessionVersions.push(record);
    this.versions.set(sessionId, sessionVersions);
    return record;
  }

  public getVersionHistory(sessionId: string): VersionRecord[] {
    const sessionVersions = this.versions.get(sessionId) ?? [];
    return [...sessionVersions].sort((a, b) => a.version - b.version);
  }

  public getVersion(sessionId: string, version: number): VersionRecord | undefined {
    const sessionVersions = this.versions.get(sessionId) ?? [];
    return sessionVersions.find((v) => v.version === version);
  }

  public getLatestVersion(sessionId: string): VersionRecord | undefined {
    const sessionVersions = this.versions.get(sessionId) ?? [];
    if (sessionVersions.length === 0) return undefined;
    return sessionVersions.reduce((latest, current) =>
      current.version > latest.version ? current : latest,
    );
  }

  public compareVersions(v1: number, v2: number): -1 | 0 | 1 {
    if (v1 < v2) return -1;
    if (v1 > v2) return 1;
    return 0;
  }

  public incrementVersion(currentVersion: number): number {
    return currentVersion + 1;
  }

  private getNextVersion(existing: VersionRecord[]): number {
    if (existing.length === 0) return 1;
    const maxVersion = Math.max(...existing.map((v) => v.version));
    return maxVersion + 1;
  }
}
