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

export const DEFAULT_MAX_VISITED_NODES = 5000;
export const DEFAULT_TRAVERSAL_BUDGET = 25000;

function bfs(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
  direction: 'forward' | 'backward' | 'both',
  maxVisitedNodes: number = DEFAULT_MAX_VISITED_NODES,
  traversalBudget: number = DEFAULT_TRAVERSAL_BUDGET,
): { visited: Set<string>; nodeDepths: Map<string, number>; collectedEdges: MetricsEdge[]; budgetExhausted: boolean } {
  const visited = new Set<string>();
  const nodeDepths = new Map<string, number>();
  const collectedEdges: MetricsEdge[] = [];
  let expansions = 0;
  let budgetExhausted = false;

  for (const seedId of seedIds) {
    if (ctx.nodeMap.has(seedId) && visited.size < maxVisitedNodes) {
      visited.add(seedId);
      nodeDepths.set(seedId, 0);
    }
  }

  let currentLevel = [...seedIds].filter((id) => visited.has(id));
  let depth = 0;

  while (currentLevel.length > 0 && depth < maxDepth && !budgetExhausted) {
    const nextLevel: string[] = [];

    for (const nodeId of currentLevel) {
      if (expansions >= traversalBudget) {
        budgetExhausted = true;
        break;
      }

      const neighbors: string[] = [];

      if (direction === 'forward' || direction === 'both') {
        const fwd = ctx.adjacency.get(nodeId) ?? [];
        neighbors.push(...fwd);
      }
      if (direction === 'backward' || direction === 'both') {
        const rev = ctx.reverseAdjacency.get(nodeId) ?? [];
        neighbors.push(...rev);
      }

      expansions += neighbors.length;

      for (const neighborId of neighbors) {
        if (visited.size >= maxVisitedNodes) {
          budgetExhausted = true;
          break;
        }
        const edge = findEdge(ctx, nodeId, neighborId, direction);
        if (edge) collectedEdges.push(edge);

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          nodeDepths.set(neighborId, depth + 1);
          if (visited.size <= maxVisitedNodes) {
            nextLevel.push(neighborId);
          }
        }
      }
    }

    currentLevel = nextLevel.sort();
    depth++;
  }

  return { visited, nodeDepths, collectedEdges, budgetExhausted };
}

function findEdge(
  ctx: RetrievalContext,
  sourceId: string,
  targetId: string,
  direction: 'forward' | 'backward' | 'both',
): MetricsEdge | undefined {
  if (direction === 'forward' || direction === 'both') {
    const edge = ctx.adjacencyEdge.get(sourceId)?.get(targetId);
    if (edge) return edge;
  }
  if (direction === 'backward' || direction === 'both') {
    const edge = ctx.adjacencyEdge.get(targetId)?.get(sourceId);
    if (edge) return edge;
  }
  return undefined;
}

export function retrieveDependencyNeighborhood(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
  maxVisitedNodes?: number,
  traversalBudget?: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'forward', maxVisitedNodes, traversalBudget);

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
  maxVisitedNodes?: number,
  traversalBudget?: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'backward', maxVisitedNodes, traversalBudget);

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
  maxVisitedNodes?: number,
  traversalBudget?: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, 'both', maxVisitedNodes, traversalBudget);

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
  maxVisitedNodes?: number,
  traversalBudget?: number,
): NeighborhoodResult {
  const { visited, nodeDepths, collectedEdges } = bfs(ctx, seedIds, maxDepth, direction, maxVisitedNodes, traversalBudget);

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
