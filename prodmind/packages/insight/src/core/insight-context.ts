import type { InsightContext } from '../types/index.ts';

export function createInsightContext(
  nodeIds: string[] = [],
  edgeIds: string[] = [],
  traversalIds: string[] = [],
  metricKeys: string[] = [],
  semanticRegionIds: string[] = [],
  snapshotIds: string[] = [],
): InsightContext {
  return {
    nodeIds: [...new Set(nodeIds)],
    edgeIds: [...new Set(edgeIds)],
    traversalIds: [...new Set(traversalIds)],
    metricKeys: [...new Set(metricKeys)],
    semanticRegionIds: [...new Set(semanticRegionIds)],
    snapshotIds: [...new Set(snapshotIds)],
  };
}

export function mergeContexts(a: InsightContext, b: InsightContext): InsightContext {
  return {
    nodeIds: [...new Set([...a.nodeIds, ...b.nodeIds])],
    edgeIds: [...new Set([...a.edgeIds, ...b.edgeIds])],
    traversalIds: [...new Set([...a.traversalIds, ...b.traversalIds])],
    metricKeys: [...new Set([...a.metricKeys, ...b.metricKeys])],
    semanticRegionIds: [...new Set([...a.semanticRegionIds, ...b.semanticRegionIds])],
    snapshotIds: [...new Set([...a.snapshotIds, ...b.snapshotIds])],
  };
}
