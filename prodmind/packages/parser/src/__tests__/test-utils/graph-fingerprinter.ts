import type { MetricsNode, MetricsEdge } from '../../metrics/metrics-types.ts';
import type { RetrievedNode, RetrievedEdge, RetrievalResult, NeighborhoodResult, BlastRadiusResult } from '../../retrieval/retrieval-types.ts';
import { canonicalFingerprint } from './canonical-json.ts';

export function fingerprintGraph(nodes: MetricsNode[], edges: MetricsEdge[]): string {
  return canonicalFingerprint({ nodes, edges });
}

export function fingerprintNeighborhood(result: NeighborhoodResult): string {
  const sortedNodes = [...result.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const sortedEdges = [...result.edges].sort((a, b) => a.edgeId.localeCompare(b.edgeId));
  return canonicalFingerprint({
    nodes: sortedNodes,
    edges: sortedEdges,
    maxDepthReached: result.maxDepthReached,
  });
}

export function fingerprintBlastRadius(result: BlastRadiusResult): string {
  const fwd = [...result.forwardImpacts].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const bwd = [...result.backwardImpacts].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  const paths = [...result.criticalPaths].sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
  return canonicalFingerprint({
    entryPoint: result.entryPoint,
    forwardImpacts: fwd,
    backwardImpacts: bwd,
    criticalPaths: paths,
    totalAffected: result.totalAffected,
  });
}

export function fingerprintRetrievalResult(result: RetrievalResult): string {
  const metaStable = { ...result.metadata };
  delete (metaStable as Record<string, unknown>)['generatedAt'];
  return canonicalFingerprint({
    metadata: metaStable,
    nodes: [...result.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    edges: [...result.edges].sort((a, b) => a.edgeId.localeCompare(b.edgeId)),
    stats: result.stats,
  });
}

export function fingerprintRanking(nodes: RetrievedNode[]): string {
  return canonicalFingerprint(nodes.map((n) => ({
    nodeId: n.nodeId,
    centralityScore: n.centralityScore,
    instabilityScore: n.instabilityScore,
    propagationRiskScore: n.propagationRiskScore,
    depth: n.depth,
  })));
}

export function fingerprintOrdering(nodes: RetrievedNode[]): string {
  return canonicalFingerprint(nodes.map((n) => n.nodeId));
}

export function fingerprintRetrievedNodes(nodes: RetrievedNode[]): string {
  const sorted = [...nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  return canonicalFingerprint(sorted);
}

export function fingerprintRetrievedEdges(edges: RetrievedEdge[]): string {
  const sorted = [...edges].sort((a, b) => a.edgeId.localeCompare(b.edgeId));
  return canonicalFingerprint(sorted);
}
