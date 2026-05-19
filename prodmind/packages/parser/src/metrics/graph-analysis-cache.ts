import type { MetricsNode, MetricsEdge } from './metrics-types.ts';
import type { SemanticType } from '@prodmind/contracts';

export interface SCCResult {
  componentMap: Map<string, number>;
  condensationDAG: Map<number, Set<number>>;
  componentCount: number;
  componentNodes: Map<number, string[]>;
}

export interface GraphAnalysisCache {
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  snapshotId: string;
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
  fanMetrics: Map<string, { fanIn: number; fanOut: number }>;
  namespaceTree: Map<string, string[]>;
  nodeIdToPath: Map<string, string>;
  scc: SCCResult | null;
  semanticTypes: Map<string, SemanticType>;
  sortedNodeIds: string[];
}

function getSortedKeys<V>(map: Map<string, V>): string[] {
  return Array.from(map.keys()).sort();
}

function buildNamespaceTree(nodes: MetricsNode[]): Map<string, string[]> {
  const tree = new Map<string, string[]>();
  for (const n of nodes) {
    const normalized = n.filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    const existing = tree.get(namespace) ?? [];
    existing.push(n.id);
    tree.set(namespace, existing);
  }
  return tree;
}

function buildAdjacency(nodes: MetricsNode[], edges: MetricsEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.sourceNodeId);
    if (list) list.push(e.targetNodeId);
  }
  return adj;
}

function buildReverseAdjacency(nodes: MetricsNode[], edges: MetricsEdge[]): Map<string, string[]> {
  const rev = new Map<string, string[]>();
  for (const n of nodes) rev.set(n.id, []);
  for (const e of edges) {
    const list = rev.get(e.targetNodeId);
    if (list) list.push(e.sourceNodeId);
  }
  return rev;
}

function buildFanMetrics(adj: Map<string, string[]>, rev: Map<string, string[]>): Map<string, { fanIn: number; fanOut: number }> {
  const metrics = new Map<string, { fanIn: number; fanOut: number }>();
  for (const key of getSortedKeys(adj)) {
    metrics.set(key, {
      fanIn: (rev.get(key) ?? []).length,
      fanOut: (adj.get(key) ?? []).length,
    });
  }
  return metrics;
}

function kosarajuSCC(
  edges: MetricsEdge[],
  adj: Map<string, string[]>,
  rev: Map<string, string[]>,
): SCCResult {
  const sortedIds = getSortedKeys(adj);

  const visited = new Set<string>();
  const order: string[] = [];

  function dfs1Iterative(startId: string) {
    const stack: Array<{ nodeId: string; iter: 'push' | 'pop' }> = [
      { nodeId: startId, iter: 'push' },
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;

      if (frame.iter === 'pop') {
        order.push(frame.nodeId);
        continue;
      }

      if (visited.has(frame.nodeId)) continue;
      visited.add(frame.nodeId);

      stack.push({ nodeId: frame.nodeId, iter: 'pop' });
      const neighbors = adj.get(frame.nodeId) ?? [];
      for (let i = neighbors.length - 1; i >= 0; i--) {
        const neighbor = neighbors[i]!;
        if (!visited.has(neighbor)) {
          stack.push({ nodeId: neighbor, iter: 'push' });
        }
      }
    }
  }

  for (const nid of sortedIds) {
    if (!visited.has(nid)) dfs1Iterative(nid);
  }

  const componentMap = new Map<string, number>();
  let compId = 0;

  function dfs2Iterative(startId: string, id: number) {
    const stack = [startId];
    while (stack.length > 0) {
      const nid = stack.pop()!;
      if (componentMap.has(nid)) continue;
      componentMap.set(nid, id);
      for (const neighbor of rev.get(nid) ?? []) {
        if (!componentMap.has(neighbor)) stack.push(neighbor);
      }
    }
  }

  for (let i = order.length - 1; i >= 0; i--) {
    const nid = order[i]!;
    if (!componentMap.has(nid)) {
      dfs2Iterative(nid, compId);
      compId++;
    }
  }

  const condensationDAG = new Map<number, Set<number>>();
  const componentNodes = new Map<number, string[]>();

  for (const [nid, cid] of componentMap) {
    const list = componentNodes.get(cid) ?? [];
    list.push(nid);
    componentNodes.set(cid, list);
    if (!condensationDAG.has(cid)) condensationDAG.set(cid, new Set());
  }

  for (const e of edges) {
    const srcComp = componentMap.get(e.sourceNodeId);
    const tgtComp = componentMap.get(e.targetNodeId);
    if (srcComp !== undefined && tgtComp !== undefined && srcComp !== tgtComp) {
      condensationDAG.get(srcComp)!.add(tgtComp);
    }
  }

  return { componentMap, condensationDAG, componentCount: compId, componentNodes };
}

export function createGraphAnalysisCache(
  nodes: MetricsNode[],
  edges: MetricsEdge[],
  snapshotId: string,
  semanticTypes?: Map<string, SemanticType>,
): GraphAnalysisCache {
  const nodeIdToPath = new Map<string, string>();
  for (const n of nodes) nodeIdToPath.set(n.id, n.filePath);

  const adj = buildAdjacency(nodes, edges);
  const rev = buildReverseAdjacency(nodes, edges);
  const fanMetrics = buildFanMetrics(adj, rev);
  const namespaceTree = buildNamespaceTree(nodes);
  const sortedNodeIds = getSortedKeys(adj);

  const scc = kosarajuSCC(edges, adj, rev);

  return {
    nodes,
    edges,
    snapshotId,
    adjacency: adj,
    reverseAdjacency: rev,
    fanMetrics,
    namespaceTree,
    nodeIdToPath,
    scc,
    semanticTypes: semanticTypes ?? new Map(),
    sortedNodeIds,
  };
}

export function getNodeCount(cache: GraphAnalysisCache): number {
  return cache.sortedNodeIds.length;
}

export function getEdgeCount(cache: GraphAnalysisCache): number {
  return cache.edges.length;
}

export function computeReachabilityCounts(cache: GraphAnalysisCache): Map<string, number> {
  if (!cache.scc) return new Map();
  const scc = cache.scc;

  const memo = new Map<number, Set<number>>();

  for (let i = scc.componentCount - 1; i >= 0; i--) {
    const reachable = new Set<number>([i]);
    const children = scc.condensationDAG.get(i) ?? [];
    for (const child of children) {
      const childReachable = memo.get(child);
      if (childReachable) {
        for (const c of childReachable) reachable.add(c);
      }
    }
    memo.set(i, reachable);
  }

  const result = new Map<string, number>();
  for (const nid of cache.sortedNodeIds) {
    const compId = scc.componentMap.get(nid);
    if (compId === undefined) {
      result.set(nid, 0);
      continue;
    }
    const reachableComps = memo.get(compId) ?? new Set();
    let count = 0;
    for (const rc of reachableComps) {
      count += (scc.componentNodes.get(rc) ?? []).length;
    }
    result.set(nid, count);
  }

  return result;
}

export function computeDepths(cache: GraphAnalysisCache): Map<string, number> {
  if (!cache.scc) return new Map();
  const scc = cache.scc;

  const depthMemo = new Map<number, number>();
  for (let i = scc.componentCount - 1; i >= 0; i--) {
    let maxChild = 0;
    const children = scc.condensationDAG.get(i) ?? [];
    for (const child of children) {
      const childDepth = depthMemo.get(child) ?? 0;
      if (childDepth > maxChild) maxChild = childDepth;
    }
    depthMemo.set(i, maxChild + 1);
  }

  const result = new Map<string, number>();
  for (const nid of cache.sortedNodeIds) {
    const compId = scc.componentMap.get(nid);
    const depth = compId !== undefined ? (depthMemo.get(compId) ?? 0) : 0;
    result.set(nid, depth);
  }

  return result;
}
