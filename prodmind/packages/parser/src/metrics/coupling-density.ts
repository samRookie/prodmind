import type { CouplingDensityResult } from './metrics-types.ts';
import type { GraphAnalysisCache } from './graph-analysis-cache.ts';
import { CouplingDensityError } from './metrics-errors.ts';

function getSortedKeys<V>(map: Map<string, V>): string[] {
  return Array.from(map.keys()).sort();
}

export function computeGlobalDensity(cache: GraphAnalysisCache): number {
  const V = cache.sortedNodeIds.length;
  const E = cache.edges.length;
  if (V <= 1) return 0;
  return (2 * E) / (V * (V - 1));
}

function buildNamespaceConnectivity(
  cache: GraphAnalysisCache,
): Map<string, { internal: number; external: number }> {
  const nsEdges = new Map<string, { internal: number; external: number }>();

  for (const ns of getSortedKeys(cache.namespaceTree)) {
    nsEdges.set(ns, { internal: 0, external: 0 });
  }

  for (const e of cache.edges) {
    let srcNs = 'root';
    let tgtNs = 'root';
    for (const [ns, ids] of cache.namespaceTree) {
      if (ids.includes(e.sourceNodeId)) srcNs = ns;
      if (ids.includes(e.targetNodeId)) tgtNs = ns;
    }
    const entry = nsEdges.get(srcNs);
    if (entry) {
      if (srcNs === tgtNs) entry.internal++;
      else entry.external++;
    }
  }

  return nsEdges;
}

function computeClusterDensityCombo(cache: GraphAnalysisCache): Array<{ clusterName: string; density: number; nodeCount: number }> {
  const nsConnectivity = buildNamespaceConnectivity(cache);
  const results: Array<{ clusterName: string; density: number; nodeCount: number }> = [];

  for (const ns of getSortedKeys(nsConnectivity)) {
    const conn = nsConnectivity.get(ns)!;
    const nodeIds = cache.namespaceTree.get(ns) ?? [];
    const total = conn.internal + conn.external;

    const namespaceScore = total > 0 ? conn.internal / total : 0;

    const connectivityScore = (() => {
      if (nodeIds.length <= 1) return 0;
      let internalEdges = 0;
      const nodeSet = new Set(nodeIds);
      for (const e of cache.edges) {
        if (nodeSet.has(e.sourceNodeId) && nodeSet.has(e.targetNodeId)) {
          internalEdges++;
        }
      }
      const maxEdges = (nodeIds.length * (nodeIds.length - 1)) / 2;
      return maxEdges > 0 ? (internalEdges / 2) / maxEdges : 0;
    })();

    const semanticScore = (() => {
      if (nodeIds.length <= 1) return 1;
      const types = new Set<string>();
      for (const nid of nodeIds) {
        const st = cache.semanticTypes.get(nid);
        if (st) types.add(st);
      }
      return types.size <= 1 ? 1 : 1 / types.size;
    })();

    const density = namespaceScore * 0.4 + connectivityScore * 0.4 + semanticScore * 0.2;

    results.push({
      clusterName: ns === 'root' ? 'root' : ns.split('/').pop() ?? ns,
      density: Number(density.toFixed(4)),
      nodeCount: nodeIds.length,
    });
  }

  return results.sort((a, b) => a.clusterName.localeCompare(b.clusterName));
}

function computeEdgeConcentration(cache: GraphAnalysisCache): number {
  const E = cache.edges.length;
  if (E === 0) return 0;

  const nodeEdgeCounts = new Map<string, number>();
  for (const nid of cache.sortedNodeIds) nodeEdgeCounts.set(nid, 0);
  for (const e of cache.edges) {
    nodeEdgeCounts.set(e.sourceNodeId, (nodeEdgeCounts.get(e.sourceNodeId) ?? 0) + 1);
    nodeEdgeCounts.set(e.targetNodeId, (nodeEdgeCounts.get(e.targetNodeId) ?? 0) + 1);
  }

  let sumSquares = 0;
  for (const count of nodeEdgeCounts.values()) {
    const share = count / (2 * E);
    sumSquares += share * share;
  }

  return Number(sumSquares.toFixed(4));
}

function computeInternalExternalRatios(cache: GraphAnalysisCache): Array<{ nodeId: string; filePath: string; internalRatio: number; externalRatio: number }> {
  const results: Array<{ nodeId: string; filePath: string; internalRatio: number; externalRatio: number }> = [];

  for (const nodeId of cache.sortedNodeIds) {
    const filePath = cache.nodeIdToPath.get(nodeId) ?? '';
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const myNamespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';

    let internal = 0;
    let external = 0;

    for (const e of cache.edges) {
      if (e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId) continue;

      let otherNs = 'root';
      const otherId = e.sourceNodeId === nodeId ? e.targetNodeId : e.sourceNodeId;
      const otherPath = cache.nodeIdToPath.get(otherId) ?? '';
      const otherNormalized = otherPath.replace(/\\/g, '/');
      const otherParts = otherNormalized.split('/');
      otherNs = otherParts.length > 1 ? otherParts.slice(0, -1).join('/') : 'root';

      if (myNamespace === otherNs) internal++;
      else external++;
    }

    const total = internal + external;
    results.push({
      nodeId,
      filePath,
      internalRatio: total > 0 ? Number((internal / total).toFixed(4)) : 0,
      externalRatio: total > 0 ? Number((external / total).toFixed(4)) : 0,
    });
  }

  return results;
}

export function computeCouplingDensity(cache: GraphAnalysisCache): CouplingDensityResult {
  try {
    return {
      globalDensity: Number(computeGlobalDensity(cache).toFixed(6)),
      clusterDensities: computeClusterDensityCombo(cache),
      edgeConcentration: computeEdgeConcentration(cache),
      internalVsExternalRatios: computeInternalExternalRatios(cache),
    };
  } catch (err) {
    throw new CouplingDensityError(
      err instanceof Error ? err.message : 'Coupling density computation failed',
    );
  }
}
