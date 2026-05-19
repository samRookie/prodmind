import { RetrievalOrdering } from '@prodmind/contracts';
import type { RetrievalContext, RetrievedNode, SymbolNeighborhoodResult } from './retrieval-types.ts';
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

export function retrieveSymbolOwners(
  ctx: RetrievalContext,
  symbolName: string,
): RetrievedNode[] {
  const ownerIds = ctx.symbolOwnershipMap.get(symbolName) ?? [];
  const nodes = ownerIds.map((id) => toRetrievedNode(id, 0, ctx));
  return stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx);
}

export function retrieveSymbolNeighbors(
  ctx: RetrievalContext,
  symbolName: string,
): RetrievedNode[] {
  const ownerIds = ctx.symbolOwnershipMap.get(symbolName) ?? [];
  if (ownerIds.length === 0) return [];

  const dependentSet = new Set<string>();
  for (const ownerId of ownerIds) {
    const rev = ctx.reverseAdjacency.get(ownerId) ?? [];
    for (const neighborId of rev) {
      dependentSet.add(neighborId);
    }
  }

  const nodes: RetrievedNode[] = [];
  for (const ownerId of ownerIds) {
    nodes.push(toRetrievedNode(ownerId, 0, ctx));
  }
  for (const depId of dependentSet) {
    if (!ownerIds.includes(depId)) {
      nodes.push(toRetrievedNode(depId, 1, ctx));
    }
  }

  return stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx);
}

export function retrieveSharedNamespaces(
  ctx: RetrievalContext,
  namespace: string,
): RetrievedNode[] {
  const nodeIds = ctx.namespaceMap.get(namespace) ?? [];
  const nodes = nodeIds.map((id) => toRetrievedNode(id, 0, ctx));
  return stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx);
}

export function retrieveCrossModuleSymbolUsage(
  ctx: RetrievalContext,
  symbolName: string,
): SymbolNeighborhoodResult {
  const ownerIds = ctx.symbolOwnershipMap.get(symbolName) ?? [];
  const owningNodes = ownerIds.map((id) => toRetrievedNode(id, 0, ctx));

  const dependentIds = new Set<string>();
  const crossModuleReferences: Array<{ sourceNodeId: string; targetNodeId: string; symbolName: string }> = [];

  for (const ownerId of ownerIds) {
    const rev = ctx.reverseAdjacency.get(ownerId) ?? [];
    for (const neighborId of rev) {
      dependentIds.add(neighborId);
      const edge = findEdgeBetween(ctx, neighborId, ownerId);
      if (edge && edge.edgeType === 'IMPORTS') {
        crossModuleReferences.push({
          sourceNodeId: neighborId,
          targetNodeId: ownerId,
          symbolName,
        });
      }
    }
  }

  const dependentNodes: RetrievedNode[] = [];
  for (const depId of dependentIds) {
    if (!ownerIds.includes(depId)) {
      const node = ctx.nodeMap.get(depId);
      if (node) {
        dependentNodes.push(toRetrievedNode(depId, 1, ctx));
      }
    }
  }

  return {
    symbolName,
    owningNodes: stableNodeSort(owningNodes, RetrievalOrdering.DETERMINISTIC, ctx),
    dependentNodes: stableNodeSort(dependentNodes, RetrievalOrdering.DETERMINISTIC, ctx),
    crossModuleReferences,
  };
}

function findEdgeBetween(
  ctx: RetrievalContext,
  sourceId: string,
  targetId: string,
): { edgeType: string; sourceNodeId: string; targetNodeId: string } | undefined {
  for (const e of ctx.edgeMap.values()) {
    if (e.sourceNodeId === sourceId && e.targetNodeId === targetId) {
      return { edgeType: e.edgeType, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId };
    }
  }
  return undefined;
}
