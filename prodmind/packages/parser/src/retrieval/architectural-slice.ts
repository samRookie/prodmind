import { RetrievalOrdering } from '@prodmind/contracts';
import type { SemanticType } from '@prodmind/contracts';
import type { RetrievalContext, RetrievedNode, RetrievedEdge, ArchitecturalSliceResult } from './retrieval-types.ts';
import { stableNodeSort, stableEdgeSort } from './deterministic-ordering.ts';

const INFRASTRUCTURE_TYPES: SemanticType[] = [
  'INFRASTRUCTURE' as SemanticType,
  'CONFIGURATION' as SemanticType,
  'BUILD_SYSTEM' as SemanticType,
];

const BUSINESS_DOMAIN_TYPES: SemanticType[] = [
  'DOMAIN_LAYER' as SemanticType,
  'SERVICE_LAYER' as SemanticType,
  'API_LAYER' as SemanticType,
  'DATA_LAYER' as SemanticType,
];

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

export function retrieveArchitecturalSlice(
  ctx: RetrievalContext,
  semanticTypes: SemanticType[],
): ArchitecturalSliceResult {
  const matchingIds = new Set<string>();
  const typeSet = new Set(semanticTypes);

  for (const [nodeId, sem] of ctx.semanticMap) {
    if (typeSet.has(sem.semanticType)) {
      matchingIds.add(nodeId);
    }
  }

  const nodes: RetrievedNode[] = [];
  const edges: RetrievedEdge[] = [];
  const seenEdges = new Set<string>();

  for (const nodeId of matchingIds) {
    nodes.push(toRetrievedNode(nodeId, 0, ctx));

    const fwd = ctx.adjacency.get(nodeId) ?? [];
    for (const neighborId of fwd) {
      if (matchingIds.has(neighborId)) {
        const edge = findEdge(ctx, nodeId, neighborId);
        if (edge && !seenEdges.has(edge.id)) {
          seenEdges.add(edge.id);
          edges.push({
            edgeId: edge.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            edgeType: edge.edgeType,
            weight: edge.weight ?? null,
            metadataJson: edge.metadataJson ?? null,
          });
        }
      }
    }

    const rev = ctx.reverseAdjacency.get(nodeId) ?? [];
    for (const neighborId of rev) {
      if (matchingIds.has(neighborId)) {
        const edge = findEdge(ctx, neighborId, nodeId);
        if (edge && !seenEdges.has(edge.id)) {
          seenEdges.add(edge.id);
          edges.push({
            edgeId: edge.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            edgeType: edge.edgeType,
            weight: edge.weight ?? null,
            metadataJson: edge.metadataJson ?? null,
          });
        }
      }
    }
  }

  return {
    sliceType: 'cluster',
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    clusters: [],
    semanticTypes: [...typeSet],
  };
}

export function retrieveInfrastructureSlice(
  ctx: RetrievalContext,
): ArchitecturalSliceResult {
  return retrieveArchitecturalSlice(ctx, INFRASTRUCTURE_TYPES);
}

export function retrieveBusinessDomainSlice(
  ctx: RetrievalContext,
): ArchitecturalSliceResult {
  return retrieveArchitecturalSlice(ctx, BUSINESS_DOMAIN_TYPES);
}

export function retrieveSemanticClusterSlice(
  ctx: RetrievalContext,
  clusterNames: string[],
): ArchitecturalSliceResult {
  const clusterSet = new Set(clusterNames);

  const clsuterNodeIds = new Set<string>();
  const matchedClusters: string[] = [];

  for (const nodeId of ctx.sortedNodeIds) {
    const sem = ctx.semanticMap.get(nodeId);
    if (sem && clusterSet.has(sem.semanticType)) {
      clsuterNodeIds.add(nodeId);
      matchedClusters.push(sem.semanticType);
    }
  }

  const nodes: RetrievedNode[] = [];
  const edges: RetrievedEdge[] = [];
  const seenEdges = new Set<string>();

  for (const nodeId of clsuterNodeIds) {
    nodes.push(toRetrievedNode(nodeId, 0, ctx));

    const fwd = ctx.adjacency.get(nodeId) ?? [];
    for (const neighborId of fwd) {
      if (clsuterNodeIds.has(neighborId)) {
        const edge = findEdge(ctx, nodeId, neighborId);
        if (edge && !seenEdges.has(edge.id)) {
          seenEdges.add(edge.id);
          edges.push({
            edgeId: edge.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            edgeType: edge.edgeType,
            weight: edge.weight ?? null,
            metadataJson: edge.metadataJson ?? null,
          });
        }
      }
    }

    const rev = ctx.reverseAdjacency.get(nodeId) ?? [];
    for (const neighborId of rev) {
      if (clsuterNodeIds.has(neighborId)) {
        const edge = findEdge(ctx, neighborId, nodeId);
        if (edge && !seenEdges.has(edge.id)) {
          seenEdges.add(edge.id);
          edges.push({
            edgeId: edge.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            edgeType: edge.edgeType,
            weight: edge.weight ?? null,
            metadataJson: edge.metadataJson ?? null,
          });
        }
      }
    }
  }

  return {
    sliceType: 'cluster',
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    clusters: [...new Set(matchedClusters)],
    semanticTypes: [...new Set(matchedClusters)] as SemanticType[],
  };
}

function findEdge(
  ctx: RetrievalContext,
  sourceId: string,
  targetId: string,
): { id: string; sourceNodeId: string; targetNodeId: string; edgeType: string; weight: number | null; metadataJson: string | null } | undefined {
  return ctx.adjacencyEdge.get(sourceId)?.get(targetId);
}
