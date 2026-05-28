import type { TraversalResult } from '../types/index.ts';

export class TraversalAudit {
  private entries: Array<{
    event: string;
    traversalId: string;
    strategy: string;
    nodesVisited: number;
    depth: number;
    duration: number;
    timestamp: string;
    fingerprint: string;
  }> = [];

  public recordTraversal(traversal: TraversalResult): void {
    this.entries.push({
      event: 'TRAVERSAL_COMPLETED',
      traversalId: traversal.id,
      strategy: traversal.strategy,
      nodesVisited: traversal.nodeCount,
      depth: traversal.depth,
      duration: traversal.duration,
      timestamp: traversal.timestamp,
      fingerprint: traversal.fingerprint,
    });
  }

  public getTraversalAudit(
    traversalId?: string,
  ): Array<{
    event: string;
    traversalId: string;
    strategy: string;
    nodesVisited: number;
    depth: number;
    duration: number;
    timestamp: string;
    fingerprint: string;
  }> {
    if (traversalId) {
      return this.entries.filter((e) => e.traversalId === traversalId);
    }
    return [...this.entries];
  }

  public verifyTraversalAudit(traversalId: string): {
    verified: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const relevant = this.entries.filter((e) => e.traversalId === traversalId);
    if (relevant.length === 0) {
      return { verified: false, issues: [`No audit entries for traversal ${traversalId}`] };
    }
    for (const entry of relevant) {
      if (!entry.timestamp) issues.push(`Entry missing timestamp`);
      if (!entry.fingerprint) issues.push(`Entry missing fingerprint`);
      if (entry.depth < 0) issues.push(`Entry has negative depth`);
      if (entry.duration < 0) issues.push(`Entry has negative duration`);
      if (entry.nodesVisited < 0) issues.push(`Entry has negative nodesVisited`);
    }
    return { verified: issues.length === 0, issues };
  }

  public clear(): void {
    this.entries = [];
  }
}
