import { RetrievalOrdering } from '@prodmind/contracts';
import type { RetrievalContext, RetrievedNode, BlastRadiusResult } from './retrieval-types.ts';
import { retrieveDependencyNeighborhood, retrieveReverseDependencies } from './graph-neighborhood.ts';
import { stableNodeSort } from './deterministic-ordering.ts';

function toRetrievedNode(
  nodeId: string,
  depth: number,
  ctx: RetrievalContext,
): RetrievedNode {
  const node = ctx.nodeMap.get(nodeId);
  const cent = ctx.centralityMap.get(nodeId);
  const inst = ctx.instabilityMap.get(nodeId);
  const risk = ctx.propagationRiskMap.get(nodeId);
  const fan = ctx.fanMetricsMap.get(nodeId);
  const sem = ctx.semanticMap.get(nodeId);
  return {
    nodeId,
    filePath: node?.filePath ?? '',
    depth,
    nodeType: node?.nodeType ?? 'UNKNOWN',
    language: node?.language ?? null,
    symbolName: node?.symbolName ?? null,
    centralityScore: cent?.dependencyInfluenceScore ?? null,
    instabilityScore: inst?.instabilityScore ?? null,
    propagationRiskScore: risk?.propagationPressure ?? null,
    fanIn: fan?.fanIn ?? null,
    fanOut: fan?.fanOut ?? null,
    semanticType: sem?.semanticType ?? null,
    classification: sem?.ruleStrength ?? null,
  };
}

export function retrieveBlastRadiusSubgraph(
  ctx: RetrievalContext,
  seedNodeId: string,
  maxDepth: number,
): BlastRadiusResult {
  const forward = retrieveDependencyNeighborhood(ctx, [seedNodeId], maxDepth);
  const backward = retrieveReverseDependencies(ctx, [seedNodeId], maxDepth);

  const entryPoint = toRetrievedNode(seedNodeId, 0, ctx);

  const forwardImpacts: RetrievedNode[] = forward.nodes.filter((n) => n.nodeId !== seedNodeId);
  const backwardImpacts: RetrievedNode[] = backward.nodes.filter((n) => n.nodeId !== seedNodeId);

  const criticalPaths: Array<{ source: string; target: string; riskScore: number }> = [];
  const allAffected = new Set<string>([seedNodeId]);

  for (const node of forwardImpacts) {
    allAffected.add(node.nodeId);
    const risk = ctx.propagationRiskMap.get(node.nodeId);
    if (risk && risk.propagationPressure > 0.7) {
      criticalPaths.push({
        source: seedNodeId,
        target: node.nodeId,
        riskScore: risk.propagationPressure,
      });
    }
  }

  for (const node of backwardImpacts) {
    allAffected.add(node.nodeId);
    const risk = ctx.propagationRiskMap.get(node.nodeId);
    if (risk && risk.propagationPressure > 0.7) {
      criticalPaths.push({
        source: seedNodeId,
        target: node.nodeId,
        riskScore: risk.propagationPressure,
      });
    }
  }

  criticalPaths.sort((a, b) => b.riskScore - a.riskScore || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  return {
    entryPoint,
    forwardImpacts: stableNodeSort(forwardImpacts, RetrievalOrdering.RISK_DESC, ctx),
    backwardImpacts: stableNodeSort(backwardImpacts, RetrievalOrdering.RISK_DESC, ctx),
    criticalPaths,
    totalAffected: allAffected.size,
  };
}

export function rankPropagationRisk(
  nodes: RetrievedNode[],
  ctx: RetrievalContext,
): RetrievedNode[] {
  return stableNodeSort(nodes, RetrievalOrdering.RISK_DESC, ctx);
}

export function computeTraversalPressure(
  nodeId: string,
  ctx: RetrievalContext,
): number {
  const risk = ctx.propagationRiskMap.get(nodeId);
  if (!risk) return 0;

  let totalPressure = risk.propagationPressure;
  const fwd = ctx.adjacency.get(nodeId) ?? [];
  for (const neighborId of fwd) {
    const neighborRisk = ctx.propagationRiskMap.get(neighborId);
    if (neighborRisk) {
      totalPressure += neighborRisk.propagationPressure * 0.5;
    }
  }

  return totalPressure;
}

export function retrieveCriticalPropagationPaths(
  ctx: RetrievalContext,
  seedNodeId: string,
  maxDepth: number,
): Array<{ source: string; target: string; riskScore: number }> {
  const forward = retrieveDependencyNeighborhood(ctx, [seedNodeId], maxDepth);
  const paths: Array<{ source: string; target: string; riskScore: number }> = [];

  for (const node of forward.nodes) {
    if (node.nodeId === seedNodeId) continue;
    const risk = ctx.propagationRiskMap.get(node.nodeId);
    if (risk && risk.propagationPressure > 0.5) {
      paths.push({
        source: seedNodeId,
        target: node.nodeId,
        riskScore: risk.propagationPressure,
      });
    }
  }

  paths.sort((a, b) => b.riskScore - a.riskScore || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  return paths;
}
