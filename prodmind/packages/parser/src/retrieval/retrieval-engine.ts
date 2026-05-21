import { RetrievalStrategy, RetrievalScope, RetrievalOrdering } from '@prodmind/contracts';
import type { RetrievalStrategy as RetrievalStrategyType, RetrievalScope as RetrievalScopeType, RetrievalOrdering as RetrievalOrderingType } from '@prodmind/contracts';
import { getLimits } from '@prodmind/core';
import type { InstabilityResult, FanMetricsResult } from '../metrics/metrics-types.ts';
import type { ClassificationResult } from '../semantic/types.ts';
import type {
  RetrievalQuery,
  RetrievalContext,
  RetrievalResult,
  RetrievalMetadata,
  RetrievedNode,
  RetrievedEdge,
  NeighborhoodResult,
  BlastRadiusResult,
  ArchitecturalSliceResult,
  SymbolNeighborhoodResult,
} from './retrieval-types.ts';
import { createRetrievalCache } from './retrieval-cache.ts';
import { retrieveDependencyNeighborhood, retrieveBidirectionalNeighborhood, retrieveDepthLimitedSubgraph } from './graph-neighborhood.ts';
import { retrieveBlastRadiusSubgraph } from './blast-radius-retrieval.ts';
import { retrieveArchitecturalSlice, retrieveBusinessDomainSlice } from './architectural-slice.ts';
import { retrieveCrossModuleSymbolUsage } from './symbol-neighborhood.ts';
import { rankRetrievedNodes } from './retrieval-ranking.ts';
import { stableNodeSort, stableEdgeSort } from './deterministic-ordering.ts';
import { RetrievalError } from './retrieval-errors.ts';

export interface RetrievalInput {
  nodes: Array<{
    id: string;
    filePath: string;
    fileHash: string | null;
    nodeType: string;
    symbolName: string | null;
    language: string | null;
    metadataJson: string | null;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: string;
    weight: number | null;
    metadataJson: string | null;
  }>;
  centrality?: Array<{
    nodeId: string;
    filePath: string;
    inDegree: number;
    outDegree: number;
    reachabilityCount: number;
    dependencyInfluenceScore: number;
    isUtilityHub: boolean;
  }>;
  instability?: Array<{
    nodeId: string;
    filePath: string;
    instabilityScore: number;
    instabilityLevel: string;
    isUnstableInfrastructure: boolean;
    isVolatileCore: boolean;
    hasInversionRisk: boolean;
  }>;
  propagationRisk?: Array<{
    nodeId: string;
    filePath: string;
    propagationPressure: number;
    blastRadiusAmplification: number;
    cascadeEstimate: number;
    isChokePoint: boolean;
  }>;
  fanMetrics?: Array<{
    nodeId: string;
    filePath: string;
    fanIn: number;
    fanOut: number;
    concentration: number;
    fanLevel: string;
    isUtilityHotspot: boolean;
    isGodModule: boolean;
  }>;
  classifications?: Array<{
    nodeId: string;
    filePath: string;
    semanticType: string;
    ruleStrength: string;
    classificationReasons: string[];
    matchedHeuristics: Array<{ ruleName: string; pattern: string; matched: boolean }>;
  }>;
  snapshotId: string;
}

export class RetrievalEngine {
  private buildContext(input: RetrievalInput): RetrievalContext {
    return createRetrievalCache({
      nodes: input.nodes,
      edges: input.edges,
      classifications: input.classifications as ClassificationResult[] | undefined,
      centrality: input.centrality,
      instability: input.instability as InstabilityResult[] | undefined,
      propagationRisk: input.propagationRisk,
      fanMetrics: input.fanMetrics as FanMetricsResult[] | undefined,
    });
  }

  private buildMetadata(
    snapshotId: string,
    strategy: RetrievalStrategyType,
    scope: RetrievalScopeType,
    maxDepth: number,
    maxResults: number,
    ordering: RetrievalOrderingType,
  ): RetrievalMetadata {
    return {
      snapshotId,
      strategy,
      scope,
      maxDepth,
      maxResults,
      ordering,
      generatedAt: new Date().toISOString(),
    };
  }

  retrieve(input: RetrievalInput, query: RetrievalQuery): RetrievalResult {
    const ctx = this.buildContext(input);
    const limits = getLimits();
    const maxDepth = query.maxDepth ?? limits.graph.maxRetrievalDepth;
    const maxResults = query.maxResults ?? limits.graph.maxRetrievalResults;
    const maxVisitedNodes = query.maxVisitedNodes ?? limits.graph.maxVisitedNodes;
    const traversalBudget = query.traversalBudget ?? limits.graph.maxTraversalBudget;
    const ordering = query.ordering ?? RetrievalOrdering.DETERMINISTIC;

    let nodes: RetrievedNode[] = [];
    let edges: RetrievedEdge[] = [];

    switch (query.strategy) {
      case RetrievalStrategy.DEPENDENCY_NEIGHBORHOOD: {
        const seedIds = query.seedNodeIds ?? [];
        if (seedIds.length === 0) throw new RetrievalError('seedNodeIds required for DEPENDENCY_NEIGHBORHOOD');
        const result = retrieveDependencyNeighborhood(ctx, seedIds, maxDepth, maxVisitedNodes, traversalBudget);
        nodes = result.nodes;
        edges = result.edges;
        break;
      }
      case RetrievalStrategy.BLAST_RADIUS: {
        const seedIds = query.seedNodeIds ?? [];
        if (seedIds.length === 0) throw new RetrievalError('seedNodeIds required for BLAST_RADIUS');
        const result = retrieveBlastRadiusSubgraph(ctx, seedIds[0]!, maxDepth, maxVisitedNodes, traversalBudget);
        nodes = [result.entryPoint, ...result.forwardImpacts, ...result.backwardImpacts];
        break;
      }
      case RetrievalStrategy.ARCHITECTURAL_SLICE: {
        if (query.semanticTypes && query.semanticTypes.length > 0) {
          const result = retrieveArchitecturalSlice(ctx, query.semanticTypes);
          nodes = result.nodes;
          edges = result.edges;
        } else {
          const result = retrieveBusinessDomainSlice(ctx);
          nodes = result.nodes;
          edges = result.edges;
        }
        break;
      }
      case RetrievalStrategy.DEPTH_LIMITED: {
        const seedIds = query.seedNodeIds ?? [];
        if (seedIds.length === 0) throw new RetrievalError('seedNodeIds required for DEPTH_LIMITED');
        const result = retrieveDepthLimitedSubgraph(ctx, seedIds, maxDepth, 'both', maxVisitedNodes, traversalBudget);
        nodes = result.nodes;
        edges = result.edges;
        break;
      }
      case RetrievalStrategy.METRIC_WEIGHTED: {
        const seedIds = query.seedNodeIds ?? [];
        if (seedIds.length === 0) {
          nodes = ctx.sortedNodeIds.map((id) => nodeToRetrieved(id, 0, ctx));
        } else {
          const result = retrieveBidirectionalNeighborhood(ctx, seedIds, maxDepth, maxVisitedNodes, traversalBudget);
          nodes = result.nodes;
          edges = result.edges;
        }
        nodes = rankRetrievedNodes(nodes, RetrievalOrdering.CENTRALITY_DESC, ctx);
        break;
      }
      default:
        throw new RetrievalError(`Unsupported strategy: ${query.strategy}`);
    }

    if (maxResults < nodes.length) {
      nodes = nodes.slice(0, maxResults);
    }

    const uniqueSemanticTypes = new Set(nodes.map((n) => n.semanticType).filter(Boolean));
    const uniqueNamespaces = new Set(nodes.map((n) => {
      const parts = n.filePath.replace(/\\/g, '/').split('/');
      return parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    }));

    return {
      metadata: this.buildMetadata(query.snapshotId, query.strategy, query.scope, maxDepth, maxResults, ordering),
      nodes: stableNodeSort(nodes, ordering, ctx),
      edges: stableEdgeSort(edges),
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        distinctDepthLevels: new Set(nodes.map((n) => n.depth)).size,
        uniqueSemanticTypes: uniqueSemanticTypes.size,
        uniqueNamespaces: uniqueNamespaces.size,
        propagationPathsFound: nodes.filter((n) => (n.propagationRiskScore ?? 0) > 0.5).length,
      },
    };
  }

  retrieveNeighborhood(input: RetrievalInput, query: RetrievalQuery): NeighborhoodResult {
    const ctx = this.buildContext(input);
    const seedIds = query.seedNodeIds ?? [];
    const limits = getLimits();
    const maxDepth = query.maxDepth ?? limits.graph.maxNeighborhoodDepth;
    const direction = query.scope === RetrievalScope.NODE ? 'forward' : 'both';
    return depthLimitedResult(ctx, seedIds, maxDepth, direction as 'forward' | 'backward' | 'both');
  }

  retrieveBlastRadius(input: RetrievalInput, query: RetrievalQuery): BlastRadiusResult {
    const ctx = this.buildContext(input);
    const seedIds = query.seedNodeIds ?? [];
    if (seedIds.length === 0) throw new RetrievalError('seedNodeIds required for blast radius');
    return retrieveBlastRadiusSubgraph(ctx, seedIds[0]!, query.maxDepth ?? 10);
  }

  retrieveArchitecturalSlice(input: RetrievalInput, query: RetrievalQuery): ArchitecturalSliceResult {
    const ctx = this.buildContext(input);
    if (query.semanticTypes && query.semanticTypes.length > 0) {
      return retrieveArchitecturalSlice(ctx, query.semanticTypes);
    }
    return retrieveBusinessDomainSlice(ctx);
  }

  retrieveSymbolNeighborhood(input: RetrievalInput, query: RetrievalQuery): SymbolNeighborhoodResult {
    const ctx = this.buildContext(input);
    const symbolNames = query.seedSymbolNames ?? [];
    if (symbolNames.length === 0) throw new RetrievalError('seedSymbolNames required for symbol neighborhood');
    return retrieveCrossModuleSymbolUsage(ctx, symbolNames[0]!);
  }
}

function nodeToRetrieved(nodeId: string, depth: number, ctx: RetrievalContext): RetrievedNode {
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

function depthLimitedResult(
  ctx: RetrievalContext,
  seedIds: string[],
  maxDepth: number,
  direction: 'forward' | 'backward' | 'both',
): NeighborhoodResult {
  return retrieveDepthLimitedSubgraph(ctx, seedIds, maxDepth, direction);
}
