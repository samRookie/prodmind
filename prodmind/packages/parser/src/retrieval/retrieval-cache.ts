import type { MetricsNode, MetricsEdge, CentralityResult, InstabilityResult, PropagationRiskResult, FanMetricsResult } from '../metrics/metrics-types.ts';
import type { ClassificationResult } from '../semantic/types.ts';
import type { RetrievalContext } from './retrieval-types.ts';

function getSortedKeys<V>(map: Map<string, V>): string[] {
  return Array.from(map.keys()).sort();
}

function buildNodeMap(nodes: MetricsNode[]): Map<string, MetricsNode> {
  const map = new Map<string, MetricsNode>();
  for (const n of nodes) map.set(n.id, n);
  return map;
}

function buildEdgeMap(edges: MetricsEdge[]): Map<string, MetricsEdge> {
  const map = new Map<string, MetricsEdge>();
  for (const e of edges) map.set(e.id, e);
  return map;
}

function buildAdjacency(nodes: MetricsNode[], edges: MetricsEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.sourceNodeId);
    if (list) list.push(e.targetNodeId);
  }
  for (const key of getSortedKeys(adj)) {
    adj.set(key, adj.get(key)!.sort());
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
  for (const key of getSortedKeys(rev)) {
    rev.set(key, rev.get(key)!.sort());
  }
  return rev;
}

function buildMapById<T extends { nodeId: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(item.nodeId, item);
  return map;
}

function buildNamespaceMap(nodes: MetricsNode[]): Map<string, string[]> {
  const ns = new Map<string, string[]>();
  for (const n of nodes) {
    const normalized = n.filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    const namespace = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    const existing = ns.get(namespace) ?? [];
    existing.push(n.id);
    ns.set(namespace, existing);
  }
  for (const key of getSortedKeys(ns)) {
    ns.set(key, ns.get(key)!.sort());
  }
  return ns;
}

function buildSymbolMaps(nodes: MetricsNode[]): {
  symbolNamespaceMap: Map<string, string>;
  symbolOwnershipMap: Map<string, string[]>;
} {
  const symbolNamespaceMap = new Map<string, string>();
  const symbolOwnershipMap = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.symbolName) {
      symbolNamespaceMap.set(n.symbolName, n.filePath);
      const owners = symbolOwnershipMap.get(n.symbolName) ?? [];
      owners.push(n.id);
      symbolOwnershipMap.set(n.symbolName, owners);
    }
  }
  for (const key of getSortedKeys(symbolOwnershipMap)) {
    symbolOwnershipMap.set(key, symbolOwnershipMap.get(key)!.sort());
  }
  return { symbolNamespaceMap, symbolOwnershipMap };
}

export function createRetrievalCache(input: {
  nodes: MetricsNode[];
  edges: MetricsEdge[];
  classifications?: ClassificationResult[];
  centrality?: CentralityResult[];
  instability?: InstabilityResult[];
  propagationRisk?: PropagationRiskResult[];
  fanMetrics?: FanMetricsResult[];
}): RetrievalContext {
  const nodeMap = buildNodeMap(input.nodes);
  const edgeMap = buildEdgeMap(input.edges);
  const adjacency = buildAdjacency(input.nodes, input.edges);
  const reverseAdjacency = buildReverseAdjacency(input.nodes, input.edges);
  const namespaceMap = buildNamespaceMap(input.nodes);
  const { symbolNamespaceMap, symbolOwnershipMap } = buildSymbolMaps(input.nodes);
  const sortedNodeIds = getSortedKeys(nodeMap);

  const semanticMap = buildMapById(input.classifications ?? []);
  const centralityMap = buildMapById(input.centrality ?? []);
  const instabilityMap = buildMapById(input.instability ?? []);
  const propagationRiskMap = buildMapById(input.propagationRisk ?? []);
  const fanMetricsMap = buildMapById(input.fanMetrics ?? []);

  return Object.freeze({
    adjacency,
    reverseAdjacency,
    nodeMap,
    edgeMap,
    semanticMap,
    centralityMap,
    instabilityMap,
    propagationRiskMap,
    fanMetricsMap,
    namespaceMap,
    symbolNamespaceMap,
    symbolOwnershipMap,
    sortedNodeIds,
  });
}
