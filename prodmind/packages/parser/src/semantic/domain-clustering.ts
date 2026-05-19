import { createHash } from 'node:crypto';
import type { DomainClusterResult } from './types.ts';
import { detectArchitecturalRegions, type ArchitecturalRegion } from './architectural-region.ts';

interface ClusterInputNode {
  id: string;
  filePath: string;
}

interface ClusterInputEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

function generateClusterId(snapshotId: string, clusterName: string): string {
  const hash = createHash('sha256')
    .update(`${snapshotId}:cluster:${clusterName}`)
    .digest('hex')
    .slice(0, 16);
  return `${snapshotId}-CLUSTER-${hash}`;
}

function buildNamespaceMap(nodes: ClusterInputNode[]): Map<string, string[]> {
  const namespaceMap = new Map<string, string[]>();

  for (const n of nodes) {
    const normalized = n.filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';

    const existing = namespaceMap.get(namespace) ?? [];
    existing.push(n.id);
    namespaceMap.set(namespace, existing);
  }

  return namespaceMap;
}

function buildAdjacencyList(
  nodes: ClusterInputNode[],
  edges: ClusterInputEdge[],
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) {
    adj.set(n.id, new Set());
  }
  for (const e of edges) {
    const sourceSet = adj.get(e.sourceNodeId);
    const targetSet = adj.get(e.targetNodeId);
    if (sourceSet) sourceSet.add(e.targetNodeId);
    if (targetSet) targetSet.add(e.sourceNodeId);
  }
  return adj;
}

function computeCohesion(
  clusterNodeIds: string[],
  adj: Map<string, Set<string>>,
): number {
  if (clusterNodeIds.length <= 1) return 0;

  const nodeSet = new Set(clusterNodeIds);
  let internalEdges = 0;
  let externalEdges = 0;

  for (const nodeId of clusterNodeIds) {
    const neighbors = adj.get(nodeId);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (nodeSet.has(n)) {
        internalEdges++;
      } else {
        externalEdges++;
      }
    }
  }

  internalEdges = Math.floor(internalEdges / 2);
  const total = internalEdges + externalEdges;
  if (total === 0) return 0;

  return internalEdges / total;
}

function computeFragmentation(
  clusterNodeIds: string[],
  namespaceMap: Map<string, string[]>,
): number {
  const namespaceCount = new Map<string, number>();
  for (const nodeId of clusterNodeIds) {
    let foundNamespace = false;
    for (const [ns, ids] of namespaceMap) {
      if (ids.includes(nodeId)) {
        const count = namespaceCount.get(ns) ?? 0;
        namespaceCount.set(ns, count + 1);
        foundNamespace = true;
        break;
      }
    }
    if (!foundNamespace) {
      const count = namespaceCount.get('unknown') ?? 0;
      namespaceCount.set('unknown', count + 1);
    }
  }

  if (namespaceCount.size <= 1) return 0;
  const maxCount = Math.max(...namespaceCount.values());
  const totalNodes = clusterNodeIds.length;
  return 1 - maxCount / totalNodes;
}

export function clusterDomainRegions(
  snapshotId: string,
  nodes: ClusterInputNode[],
  edges: ClusterInputEdge[],
): DomainClusterResult[] {
  const namespaceMap = buildNamespaceMap(nodes);
  const adj = buildAdjacencyList(nodes, edges);

  const clusters: DomainClusterResult[] = [];

  for (const [namespace, nodeIds] of namespaceMap) {
    if (nodeIds.length === 0) continue;

    const sortedIds = [...nodeIds].sort();
    const cohesion = computeCohesion(sortedIds, adj);

    const regions = detectArchitecturalRegions({
      nodes: nodes.filter((n) => sortedIds.includes(n.id)),
      edges,
    });

    const fragmentation = computeFragmentation(sortedIds, namespaceMap);

    const boundaryMeta = regions.length > 0
      ? JSON.stringify({
          regionCount: regions.length,
          regions: regions.map((r: ArchitecturalRegion) => ({
            name: r.regionName,
            boundaryType: r.boundaryType,
            connectivityScore: r.connectivityScore,
            nodeCount: r.nodeIds.length,
          })),
        })
      : null;

    const clusterName = namespace === 'root' ? 'root' : namespace.split('/').pop() ?? namespace;

    clusters.push({
      clusterId: generateClusterId(snapshotId, clusterName),
      snapshotId,
      clusterName,
      nodeIds: sortedIds,
      cohesionScore: cohesion,
      fragmentationScore: fragmentation,
      boundaryMetadataJson: boundaryMeta,
    });
  }

  return clusters.sort((a, b) => a.clusterName.localeCompare(b.clusterName));
}

export function computeClusterAffinity(
  clusterA: DomainClusterResult,
  clusterB: DomainClusterResult,
): number {
  const setA = new Set(clusterA.nodeIds);
  const setB = new Set(clusterB.nodeIds);
  const intersection = [...setA].filter((id) => setB.has(id));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

export function detectSharedClusters(
  clusters: DomainClusterResult[],
): DomainClusterResult[] {
  return clusters.filter(
    (c) =>
      c.clusterName === 'shared' ||
      c.clusterName === 'utils' ||
      c.clusterName === 'lib' ||
      c.clusterName === 'common',
  );
}

export function detectFragmentedDomains(
  clusters: DomainClusterResult[],
): DomainClusterResult[] {
  return clusters
    .filter((c) => c.fragmentationScore > 0.5)
    .sort((a, b) => b.fragmentationScore - a.fragmentationScore);
}
