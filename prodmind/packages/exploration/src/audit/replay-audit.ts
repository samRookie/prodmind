import { generateId, nowISO } from '../utils/index.ts';

export class ReplayAudit {
  private entries: Array<{
    replayId: string;
    type: 'TRAVERSAL' | 'QUERY';
    originalFingerprint: string;
    replayedFingerprint: string;
    match: boolean;
    timestamp: string;
  }> = [];

  public recordReplay(
    type: 'TRAVERSAL' | 'QUERY',
    originalFingerprint: string,
    replayedFingerprint: string,
    match: boolean,
  ): void {
    this.entries.push({
      replayId: generateId('replay'),
      type,
      originalFingerprint,
      replayedFingerprint,
      match,
      timestamp: nowISO(),
    });
  }

  public getReplayAudit(
    type?: 'TRAVERSAL' | 'QUERY',
  ): Array<{
    replayId: string;
    type: 'TRAVERSAL' | 'QUERY';
    originalFingerprint: string;
    replayedFingerprint: string;
    match: boolean;
    timestamp: string;
  }> {
    if (type) {
      return this.entries.filter((e) => e.type === type);
    }
    return [...this.entries];
  }

  public verifyAllReplays(): {
    total: number;
    matches: number;
    mismatches: number;
    matchRate: number;
  } {
    const total = this.entries.length;
    if (total === 0) {
      return { total: 0, matches: 0, mismatches: 0, matchRate: 0 };
    }
    const matches = this.entries.filter((e) => e.match).length;
    const mismatches = total - matches;
    return {
      total,
      matches,
      mismatches,
      matchRate: matches / total,
    };
  }

  public clear(): void {
    this.entries = [];
  }
}
