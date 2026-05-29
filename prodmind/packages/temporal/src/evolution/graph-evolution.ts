import type { EvolutionPoint,TemporalSnapshot } from '../types/index.ts';

export function buildEvolutionPoints(snapshots: TemporalSnapshot[]): EvolutionPoint[] {
  return snapshots.map((s, _i) => ({
    snapshotId: s.id,
    timestamp: s.timestamp,
    nodeCount: s.nodeCount,
    edgeCount: s.edgeCount,
    complexity: s.nodeCount + s.edgeCount * 0.5,
    instability: 0,
    coupling: 0,
    propagation: 0,
    hotspotCount: 0,
    semanticScore: 1,
    driftScore: 0,
  }));
}

export function computeGraphGrowthRate(points: EvolutionPoint[]): number {
  if (points.length < 2) return 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const dt = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
  if (dt === 0) return 0;
  return (last.nodeCount - first.nodeCount) / dt;
}
