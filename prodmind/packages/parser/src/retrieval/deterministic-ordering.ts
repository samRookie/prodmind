import type { RetrievalOrdering } from '@prodmind/contracts';
import type { RetrievedNode, RetrievedEdge, RetrievalContext } from './retrieval-types.ts';

const SEMANTIC_IMPORTANCE: Record<string, number> = {
  DOMAIN_LAYER: 10,
  SERVICE_LAYER: 8,
  API_LAYER: 7,
  DATA_LAYER: 6,
  SHARED_UTILITY: 5,
  INFRASTRUCTURE: 4,
  UI_LAYER: 3,
  CONFIGURATION: 2,
  SECURITY: 2,
  OBSERVABILITY: 2,
  TESTING: 1,
  BUILD_SYSTEM: 1,
  UNKNOWN: 0,
};

function semanticImportance(semanticType: string | null | undefined): number {
  if (!semanticType) return 0;
  return SEMANTIC_IMPORTANCE[semanticType] ?? 0;
}

export function stableNodeSort(
  nodes: RetrievedNode[],
  order: RetrievalOrdering,
  ctx: RetrievalContext,
): RetrievedNode[] {
  return [...nodes].sort((a, b) => {
    let cmp = 0;

    switch (order) {
      case 'DEPTH_ASC':
        cmp = a.depth - b.depth;
        break;
      case 'DEPTH_DESC':
        cmp = b.depth - a.depth;
        break;
      case 'RISK_DESC': {
        const riskA = a.propagationRiskScore ?? ctx.propagationRiskMap.get(a.nodeId)?.propagationPressure ?? 0;
        const riskB = b.propagationRiskScore ?? ctx.propagationRiskMap.get(b.nodeId)?.propagationPressure ?? 0;
        cmp = riskB - riskA;
        break;
      }
      case 'CENTRALITY_DESC': {
        const centA = a.centralityScore ?? ctx.centralityMap.get(a.nodeId)?.dependencyInfluenceScore ?? 0;
        const centB = b.centralityScore ?? ctx.centralityMap.get(b.nodeId)?.dependencyInfluenceScore ?? 0;
        cmp = centB - centA;
        break;
      }
      case 'STABILITY_DESC': {
        const instA = a.instabilityScore ?? ctx.instabilityMap.get(a.nodeId)?.instabilityScore ?? 1;
        const instB = b.instabilityScore ?? ctx.instabilityMap.get(b.nodeId)?.instabilityScore ?? 1;
        cmp = instA - instB;
        break;
      }
      case 'SEMANTIC_IMPORTANCE_DESC': {
        const semA = a.semanticType ?? ctx.semanticMap.get(a.nodeId)?.semanticType ?? null;
        const semB = b.semanticType ?? ctx.semanticMap.get(b.nodeId)?.semanticType ?? null;
        cmp = semanticImportance(semB) - semanticImportance(semA);
        break;
      }
      case 'DETERMINISTIC':
      default:
        cmp = a.depth - b.depth;
        break;
    }

    if (cmp !== 0) return cmp;

    const semA = a.semanticType ?? ctx.semanticMap.get(a.nodeId)?.semanticType ?? null;
    const semB = b.semanticType ?? ctx.semanticMap.get(b.nodeId)?.semanticType ?? null;
    cmp = semanticImportance(semB) - semanticImportance(semA);
    if (cmp !== 0) return cmp;

    return a.nodeId.localeCompare(b.nodeId);
  });
}

export function stableEdgeSort(edges: RetrievedEdge[]): RetrievedEdge[] {
  return [...edges].sort((a, b) => {
    const srcCmp = a.sourceNodeId.localeCompare(b.sourceNodeId);
    if (srcCmp !== 0) return srcCmp;
    const tgtCmp = a.targetNodeId.localeCompare(b.targetNodeId);
    if (tgtCmp !== 0) return tgtCmp;
    return a.edgeId.localeCompare(b.edgeId);
  });
}

export function stableMetricSort<T extends { nodeId: string }>(
  records: T[],
  metricKey: (r: T) => number,
): T[] {
  return [...records].sort((a, b) => {
    const cmp = metricKey(b) - metricKey(a);
    if (cmp !== 0) return cmp;
    return a.nodeId.localeCompare(b.nodeId);
  });
}
