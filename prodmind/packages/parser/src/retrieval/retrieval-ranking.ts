import type { RetrievalOrdering } from '@prodmind/contracts';
import type { RetrievedNode, RetrievalContext } from './retrieval-types.ts';
import { stableNodeSort } from './deterministic-ordering.ts';

export function rankRetrievedNodes(
  nodes: RetrievedNode[],
  ordering: RetrievalOrdering,
  ctx: RetrievalContext,
): RetrievedNode[] {
  return stableNodeSort(nodes, ordering, ctx);
}

export function computeRetrievalWeight(
  node: RetrievedNode,
  ctx: RetrievalContext,
): number {
  let weight = 0;

  const cent = node.centralityScore ?? ctx.centralityMap.get(node.nodeId)?.dependencyInfluenceScore ?? 0;
  weight += cent * 0.3;

  const inst = node.instabilityScore ?? ctx.instabilityMap.get(node.nodeId)?.instabilityScore ?? 0;
  weight += inst * 0.25;

  const risk = node.propagationRiskScore ?? ctx.propagationRiskMap.get(node.nodeId)?.propagationPressure ?? 0;
  weight += risk * 0.25;

  const fan = ctx.fanMetricsMap.get(node.nodeId);
  const fanScore = fan ? (fan.fanIn + fan.fanOut) / (Math.max(fan.fanIn, fan.fanOut, 1)) : 0;
  weight += fanScore * 0.2;

  return weight;
}

export function applyMetricWeighting(
  nodes: RetrievedNode[],
  ctx: RetrievalContext,
): RetrievedNode[] {
  return [...nodes].sort((a, b) => {
    const weightA = computeRetrievalWeight(a, ctx);
    const weightB = computeRetrievalWeight(b, ctx);
    const cmp = weightB - weightA;
    if (cmp !== 0) return cmp;
    return a.nodeId.localeCompare(b.nodeId);
  });
}

const SEMANTIC_SCORES: Record<string, number> = {
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

export function applySemanticWeighting(
  nodes: RetrievedNode[],
  ctx: RetrievalContext,
): RetrievedNode[] {
  return [...nodes].sort((a, b) => {
    const semA = a.semanticType ?? ctx.semanticMap.get(a.nodeId)?.semanticType ?? null;
    const semB = b.semanticType ?? ctx.semanticMap.get(b.nodeId)?.semanticType ?? null;
    const scoreA = semA ? (SEMANTIC_SCORES[semA] ?? 0) : 0;
    const scoreB = semB ? (SEMANTIC_SCORES[semB] ?? 0) : 0;
    const cmp = scoreB - scoreA;
    if (cmp !== 0) return cmp;
    return a.nodeId.localeCompare(b.nodeId);
  });
}

export function applyRiskWeighting(
  nodes: RetrievedNode[],
  ctx: RetrievalContext,
): RetrievedNode[] {
  return [...nodes].sort((a, b) => {
    const riskA = a.propagationRiskScore ?? ctx.propagationRiskMap.get(a.nodeId)?.propagationPressure ?? 0;
    const riskB = b.propagationRiskScore ?? ctx.propagationRiskMap.get(b.nodeId)?.propagationPressure ?? 0;
    const cmp = riskB - riskA;
    if (cmp !== 0) return cmp;
    return a.nodeId.localeCompare(b.nodeId);
  });
}
