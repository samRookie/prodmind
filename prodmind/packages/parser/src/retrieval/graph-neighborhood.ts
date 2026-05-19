import type { MetricsEdge } from '../metrics/metrics-types.ts';
import type { RetrievalContext, RetrievedNode, RetrievedEdge, NeighborhoodResult } from './retrieval-types.ts';
import { RetrievalOrdering } from '@prodmind/contracts';
import { stableNodeSort, stableEdgeSort } from './deterministic-ordering.ts';

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

function toRetrievedEdge(
  edge: MetricsEdge,
): RetrievedEdge {
  return {
    edgeId: edge.id,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    edgeType: edge.edgeType,
    weight: edge.weight ?? null,
    metadataJson: edge.metadataJson ?? null,
  };
}

function bfs(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
  direction: 'forward' | 'backward' | 'both',
): { visited: Set<string>; nodeDepths: Map<string, number>; collectedEdges: MetricsEdge[] } {
  const visited = new Set<string>();
  const nodeDepths = new Map<string, number>();
  const collectedEdges: MetricsEdge[] = [];

  for (const seedId of seedIds) {
    if (ctx.nodeMap.has(seedId)) {
      visited.add(seedId);
      nodeDepths.set(seedId, 0);
    }
  }

  let currentLevel = [...seedIds];
  let depth = 0;

  while (currentLevel.length > 0 && depth < maxDepth) {
    const nextLevel: string[] = [];

    for (const nodeId of currentLevel) {
      const neighbors: string[] = [];

      if (direction === 'forward' || direction === 'both') {
        const fwd = ctx.adjacency.get(nodeId) ?? [];
        neighbors.push(...fwd);
      }
      if (direction === 'backward' || direction === 'both') {
        const rev = ctx.reverseAdjacency.get(nodeId) ?? [];
        neighbors.push(...rev);
      }

      for (const neighborId of neighbors) {
        const edge = findEdge(ctx, nodeId, neighborId, direction);
        if (edge) collectedEdges.push(edge);

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nodeDepths.set(neighborId, depth + 1);
          nextLevel.push(neighborId);
        }
      }
    }

    currentLevel = nextLevel.sort();
    depth++;
  }

  return { visited, nodeDepths, collectedEdges };
}

function findEdge(
  ctx: RetrievalContext,
  sourceId: string,
  targetId: string,
  direction: 'forward' | 'backward' | 'both',
): MetricsEdge | undefined {
  for (const e of ctx.edgeMap.values()) {
    if (direction === 'forward' || direction === 'both') {
      if (e.sourceNodeId === sourceId && e.targetNodeId === targetId) return e;
    }
    if (direction === 'backward' || direction === 'both') {
      if (e.sourceNodeId === targetId && e.targetNodeId === sourceId) return e;
    }
  }
  return undefined;
}

export function retrieveDependencyNeighborhood(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'forward');

  const nodes: RetrievedNode[] = [];
  const depthLevels = new Map<number, string[]>();

  for (const nodeId of visited) {
    const depth = nodeDepths.get(nodeId) ?? 0;
    nodes.push(toRetrievedNode(nodeId, depth, ctx));

    const level = depthLevels.get(depth) ?? [];
    level.push(nodeId);
    depthLevels.set(depth, level);
  }

  const edges: RetrievedEdge[] = collectedEdges.map(toRetrievedEdge);

  return {
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    depthLevels,
    maxDepthReached: maxDepth,
  };
}

export function retrieveReverseDependencies(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'backward');

  const nodes: RetrievedNode[] = [];
  const depthLevels = new Map<number, string[]>();

  for (const nodeId of visited) {
    const depth = nodeDepths.get(nodeId) ?? 0;
    nodes.push(toRetrievedNode(nodeId, depth, ctx));

    const level = depthLevels.get(depth) ?? [];
    level.push(nodeId);
    depthLevels.set(depth, level);
  }

  const edges: RetrievedEdge[] = collectedEdges.map(toRetrievedEdge);

  return {
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    depthLevels,
    maxDepthReached: maxDepth,
  };
}

export function retrieveBidirectionalNeighborhood(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'both');

  const nodes: RetrievedNode[] = [];
  const depthLevels = new Map<number, string[]>();

  for (const nodeId of visited) {
    const depth = nodeDepths.get(nodeId) ?? 0;
    nodes.push(toRetrievedNode(nodeId, depth, ctx));

    const level = depthLevels.get(depth) ?? [];
    level.push(nodeId);
    depthLevels.set(depth, level);
  }

  const edges: RetrievedEdge[] = collectedEdges.map(toRetrievedEdge);

  return {
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    depthLevels,
    maxDepthReached: maxDepth,
  };
}

export function retrieveDepthLimitedSubgraph(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
  direction: 'forward' | 'backward' | 'both' = 'both',
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, direction);

  const nodes: RetrievedNode[] = [];
  const depthLevels = new Map<number, string[]>();

  for (const nodeId of visited) {
    const depth = nodeDepths.get(nodeId) ?? 0;
    nodes.push(toRetrievedNode(nodeId, depth, ctx));

    const level = depthLevels.get(depth) ?? [];
    level.push(nodeId);
    depthLevels.set(depth, level);
  }

  const edges: RetrievedEdge[] = collectedEdges.map(toRetrievedEdge);

  return {
    nodes: stableNodeSort(nodes, RetrievalOrdering.DETERMINISTIC, ctx),
    edges: stableEdgeSort(edges),
    depthLevels,
    maxDepthReached: maxDepth,
  };
}
