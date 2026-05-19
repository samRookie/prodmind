import type { MetricsNode, MetricsEdge } from '../metrics/metrics-types.ts';
import type { ClassificationResult, DomainClusterResult } from '../semantic/types.ts';
import { SnapshotFrozenError } from './verification-errors.ts';

export interface FreezableSnapshot {
  snapshotId: string;
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  classifications?: ClassificationResult[];
  domainClusters?: DomainClusterResult[];
}

export interface FrozenSnapshot {
  snapshotId: string;
  nodes: readonly MetricsNode[];
  edges: readonly MetricsEdge[];
  classifications: readonly ClassificationResult[];
  domainClusters: readonly DomainClusterResult[];
  frozenAt: string;
  checksum: string;
}

function computeChecksum(data: FreezableSnapshot): string {
  const stable = JSON.stringify({
    snapshotId: data.snapshotId,
    nodes: [...data.nodes].sort((a, b) => a.id.localeCompare(b.id)).map((n) => n.id),
    edges: [...data.edges].sort((a, b) => a.id.localeCompare(b.id)).map((e) => `${e.sourceNodeId}:${e.targetNodeId}`),
    classificationsCount: data.classifications?.length ?? 0,
    domainClustersCount: data.domainClusters?.length ?? 0,
  });
  let hash = 0;
  for (let i = 0; i < stable.length; i++) {
    const chr = stable.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

export class SnapshotFreezer {
  private readonly frozenSnapshots = new Map<string, FrozenSnapshot>();

  freeze(data: FreezableSnapshot): FrozenSnapshot {
    const snapshot: FrozenSnapshot = {
      snapshotId: data.snapshotId,
      nodes: Object.freeze([...data.nodes]),
      edges: Object.freeze([...data.edges]),
      classifications: Object.freeze([...(data.classifications ?? [])]),
      domainClusters: Object.freeze([...(data.domainClusters ?? [])]),
      frozenAt: new Date().toISOString(),
      checksum: computeChecksum(data),
    };
    this.frozenSnapshots.set(data.snapshotId, snapshot);
    return snapshot;
  }

  isFrozen(snapshotId: string): boolean {
    return this.frozenSnapshots.has(snapshotId);
  }

  getFrozenSnapshot(snapshotId: string): FrozenSnapshot | null {
    return this.frozenSnapshots.get(snapshotId) ?? null;
  }

  assertMutable(snapshotId: string): void {
    if (this.isFrozen(snapshotId)) {
      throw new SnapshotFrozenError(snapshotId, 'mutate');
    }
  }

  verifyIntegrity(snapshotId: string): boolean {
    const frozen = this.frozenSnapshots.get(snapshotId);
    if (!frozen) return false;
    const recomputed = computeChecksum({
      snapshotId: frozen.snapshotId,
      nodes: [...frozen.nodes],
      edges: [...frozen.edges],
      classifications: [...frozen.classifications],
      domainClusters: [...frozen.domainClusters],
    });
    return recomputed === frozen.checksum;
  }

  clear(snapshotId: string): void {
    this.frozenSnapshots.delete(snapshotId);
  }
}
