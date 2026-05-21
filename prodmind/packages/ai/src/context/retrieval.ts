import type { ArchitecturalSliceResult,BlastRadiusResult, NeighborhoodResult, RetrievalContext } from '@prodmind/parser';
import { RetrievalEngine, type RetrievalInput, type RetrievalQuery, type RetrievalResult,type RetrievedNode } from '@prodmind/parser';
import { retrieveBidirectionalNeighborhood,retrieveDependencyNeighborhood, retrieveReverseDependencies } from '@prodmind/parser';
import { retrieveBlastRadiusSubgraph, retrieveCriticalPropagationPaths } from '@prodmind/parser';
import { retrieveArchitecturalSlice, retrieveBusinessDomainSlice, retrieveInfrastructureSlice, retrieveSemanticClusterSlice } from '@prodmind/parser';

import type { ContextConfig } from './config.ts';
import { resolveContextConfig } from './config.ts';
import type { ContextAssemblyRequest, ContextNode, ContextSlice, RankedContextResult,RetrievalCandidate } from './contracts.ts';
import { createContextNode, createContextSlice, createRankedContextResult,createRetrievalCandidate } from './contracts.ts';
import { RetrievalPhaseError } from './errors.ts';

function toContextNode(n: RetrievedNode): ContextNode {
  return createContextNode({
    nodeId: n.nodeId,
    filePath: n.filePath,
    depth: n.depth,
    nodeType: n.nodeType,
    language: n.language,
    symbolName: n.symbolName,
    centralityScore: n.centralityScore,
    instabilityScore: n.instabilityScore,
    propagationRiskScore: n.propagationRiskScore,
    fanIn: n.fanIn,
    fanOut: n.fanOut,
    semanticType: n.semanticType,
  });
}

function buildQuery(
  request: ContextAssemblyRequest,
  strategy: string,
  config: ContextConfig,
): RetrievalQuery {
  return {
    snapshotId: request.snapshotId,
    strategy: strategy as any,
    scope: 'NODE' as any,
    seedNodeIds: request.seedNodeIds ? [...request.seedNodeIds] : undefined,
    seedSymbolNames: request.seedSymbolNames ? [...request.seedSymbolNames] : undefined,
    semanticTypes: request.semanticTypes ? [...request.semanticTypes] : undefined,
    clusterNames: request.clusterNames ? [...request.clusterNames] : undefined,
    maxDepth: config.maxDepth,
    maxResults: config.maxCandidates,
    maxVisitedNodes: config.maxCandidates * 2,
    traversalBudget: config.maxCandidates * 10,
    ordering: 'DETERMINISTIC' as any,
    includeMetrics: true,
    includeSemantic: true,
  };
}

function mergeCandidates(existing: RetrievalCandidate[], incoming: RetrievalCandidate[]): RetrievalCandidate[] {
  const seen = new Set<string>();
  const result: RetrievalCandidate[] = [];

  for (const c of existing) {
    if (!seen.has(c.node.nodeId)) {
      seen.add(c.node.nodeId);
      result.push(c);
    }
  }

  for (const c of incoming) {
    if (!seen.has(c.node.nodeId)) {
      seen.add(c.node.nodeId);
      result.push(c);
    }
  }

  return result;
}

function candidatesFromNeighborhood(nr: NeighborhoodResult, source: string, config: ContextConfig): RetrievalCandidate[] {
  return nr.nodes.slice(0, config.maxCandidates).map((n) => {
    const node = toContextNode(n);
    return createRetrievalCandidate({
      node,
      compositeScore: 0,
      centralityScore: n.centralityScore ?? 0,
      proximityScore: n.depth > 0 ? 1 / (n.depth + 1) : 1,
      semanticScore: 0,
      riskScore: n.propagationRiskScore ?? 0,
      source,
      reason: `retrieved via ${source}`,
    });
  });
}

function candidatesFromBlast(br: BlastRadiusResult, source: string): RetrievalCandidate[] {
  const allNodes = [br.entryPoint, ...br.forwardImpacts, ...br.backwardImpacts];
  return allNodes.map((n) => {
    const node = toContextNode(n);
    return createRetrievalCandidate({
      node,
      compositeScore: n.propagationRiskScore ?? 0,
      centralityScore: n.centralityScore ?? 0,
      proximityScore: n.depth > 0 ? 1 / (n.depth + 1) : 1,
      semanticScore: 0,
      riskScore: n.propagationRiskScore ?? 0,
      source,
      reason: `blast radius: ${br.totalAffected} affected, ${br.criticalPaths.length} critical paths`,
    });
  });
}

function candidatesFromSlice(as: ArchitecturalSliceResult, source: string): RetrievalCandidate[] {
  return as.nodes.map((n) => {
    const node = toContextNode(n);
    return createRetrievalCandidate({
      node,
      compositeScore: n.centralityScore ?? 0,
      centralityScore: n.centralityScore ?? 0,
      proximityScore: n.depth > 0 ? 1 / (n.depth + 1) : 1,
      semanticScore: 0,
      riskScore: n.propagationRiskScore ?? 0,
      source,
      reason: `${source} slice: ${as.sliceType}`,
    });
  });
}

function candidatesFromCriticalPaths(paths: Array<{ source: string; target: string; riskScore: number }>, ctx: RetrievalContext, source: string): RetrievalCandidate[] {
  const seen = new Set<string>();
  const result: RetrievalCandidate[] = [];

    for (const path of paths) {
    if (!seen.has(path.source)) {
      seen.add(path.source);
      const node = ctx.nodeMap.get(path.source);
      if (node) {
        result.push(createRetrievalCandidate({
          node: toContextNode({
            nodeId: node.id, filePath: node.filePath, depth: 0, nodeType: node.nodeType,
            language: node.language, symbolName: node.symbolName, centralityScore: null,
            instabilityScore: null, propagationRiskScore: path.riskScore, fanIn: null, fanOut: null,
            semanticType: null, classification: null,
          }),
          compositeScore: path.riskScore,
          centralityScore: 0,
          proximityScore: 1,
          semanticScore: 0,
          riskScore: path.riskScore,
          source,
          reason: `critical path to ${path.target} (risk: ${path.riskScore.toFixed(3)})`,
        }));
      }
    }
  }

  return result;
}

export class ContextRetrievalEngine {
  private engine: RetrievalEngine;

  constructor() {
    this.engine = new RetrievalEngine();
  }

  retrieve(
    input: RetrievalInput,
    request: ContextAssemblyRequest,
    config?: ContextConfig,
  ): RankedContextResult {
    const cfg = config ?? resolveContextConfig();
    const strategies = request.strategies && request.strategies.length > 0
      ? [...request.strategies]
      : [cfg.defaultStrategy as any];

    let allCandidates: RetrievalCandidate[] = [];
    const weightsUsed: Record<string, number> = {};

    for (const strategy of strategies) {
      const query = buildQuery(request, strategy as string, cfg);
      const result: RetrievalResult = this.engine.retrieve(input, query);

      const candidates = result.nodes.map((n) => {
        const node = toContextNode(n);
        return createRetrievalCandidate({
          node,
          compositeScore: 0,
          centralityScore: n.centralityScore ?? 0,
          proximityScore: n.depth > 0 ? 1 / (n.depth + 1) : 1,
          semanticScore: 0,
          riskScore: n.propagationRiskScore ?? 0,
          source: strategy as string,
          reason: `retrieved via ${strategy}`,
        });
      });

      allCandidates = mergeCandidates(allCandidates, candidates);
    }

    if (allCandidates.length === 0) {
      throw new RetrievalPhaseError('No candidates retrieved from any strategy', 0);
    }

    const discardedCount = Math.max(0, allCandidates.length - cfg.rankingTopK);
    const selected = allCandidates.slice(0, cfg.rankingTopK);

    return createRankedContextResult({
      candidates: selected,
      strategy: strategies.join(',') || cfg.defaultStrategy,
      weightsUsed: {
        centrality: cfg.weights.centrality,
        proximity: cfg.weights.proximity,
        semantic: cfg.weights.semantic,
        risk: cfg.weights.risk,
        ...weightsUsed,
      },
      discardedCount,
    });
  }

  retrieveByDependencyChain(
    ctx: RetrievalContext,
    seedId: string,
    direction: 'upstream' | 'downstream' | 'sibling',
    config?: ContextConfig,
  ): RetrievalCandidate[] {
    const cfg = config ?? resolveContextConfig();

    let nr: NeighborhoodResult;
    switch (direction) {
      case 'upstream':
        nr = retrieveReverseDependencies(ctx, [seedId], cfg.maxDepth);
        break;
      case 'downstream':
        nr = retrieveDependencyNeighborhood(ctx, [seedId], cfg.maxDepth);
        break;
      case 'sibling':
        nr = retrieveBidirectionalNeighborhood(ctx, [seedId], cfg.maxDepth);
        break;
    }

    return candidatesFromNeighborhood(nr, `dependency_chain:${direction}`, cfg);
  }

  retrieveByBlastRadius(
    ctx: RetrievalContext,
    seedId: string,
    config?: ContextConfig,
  ): { candidates: RetrievalCandidate[]; slice: ContextSlice } {
    const cfg = config ?? resolveContextConfig();
    const br = retrieveBlastRadiusSubgraph(ctx, seedId, cfg.maxDepth);
    const candidates = candidatesFromBlast(br, 'blast_radius');

    const allNodes = [br.entryPoint, ...br.forwardImpacts, ...br.backwardImpacts];
    const nodes = allNodes.map(toContextNode);
    const slice = createContextSlice({
      kind: 'risk_oriented',
      strategy: 'BLAST_RADIUS',
      nodes,
      edges: [],
      regions: [],
      chains: [],
      tokenCount: nodes.length * 20,
      metadata: {
        entryPoint: seedId,
        totalAffected: br.totalAffected,
        criticalPaths: br.criticalPaths.length,
        forwardCount: br.forwardImpacts.length,
        backwardCount: br.backwardImpacts.length,
      },
    });

    return { candidates, slice };
  }

  retrieveByArchitecturalSlice(
    ctx: RetrievalContext,
    semanticTypes: string[],
    _config?: ContextConfig,
  ): RetrievalCandidate[] {
    const as = retrieveArchitecturalSlice(ctx, semanticTypes as any);
    return candidatesFromSlice(as, 'architectural_slice');
  }

  retrieveByBusinessDomain(ctx: RetrievalContext): RetrievalCandidate[] {
    const as = retrieveBusinessDomainSlice(ctx);
    return candidatesFromSlice(as, 'business_domain');
  }

  retrieveByInfrastructure(ctx: RetrievalContext): RetrievalCandidate[] {
    const as = retrieveInfrastructureSlice(ctx);
    return candidatesFromSlice(as, 'infrastructure');
  }

  retrieveBySemanticRegion(
    ctx: RetrievalContext,
    clusterNames: string[],
    _config?: ContextConfig,
  ): RetrievalCandidate[] {
    const as = retrieveSemanticClusterSlice(ctx, clusterNames);
    return candidatesFromSlice(as, 'semantic_region');
  }

  retrieveByHotspotPattern(
    ctx: RetrievalContext,
    threshold?: number,
    maxResults?: number,
  ): RetrievalCandidate[] {
    const limit = maxResults ?? 50;
    const instThreshold = threshold ?? 0.5;

    const hotNodes: Array<{ nodeId: string; instabilityScore: number }> = [];
    for (const nodeId of ctx.sortedNodeIds) {
      const inst = ctx.instabilityMap.get(nodeId);
      if (inst && inst.instabilityScore >= instThreshold) {
        hotNodes.push({ nodeId, instabilityScore: inst.instabilityScore });
      }
    }

    hotNodes.sort((a, b) => b.instabilityScore - a.instabilityScore);

    const candidates: RetrievalCandidate[] = [];
    for (const { nodeId, instabilityScore } of hotNodes.slice(0, limit)) {
      const raw = ctx.nodeMap.get(nodeId);
      if (!raw) continue;
      const cent = ctx.centralityMap.get(nodeId);
      const risk = ctx.propagationRiskMap.get(nodeId);
      const node = toContextNode({
        nodeId: raw.id, filePath: raw.filePath, depth: 0, nodeType: raw.nodeType,
        language: raw.language, symbolName: raw.symbolName, centralityScore: cent?.dependencyInfluenceScore ?? null,
        instabilityScore, propagationRiskScore: risk?.propagationPressure ?? null, fanIn: null, fanOut: null,
        semanticType: null, classification: null,
      });
      candidates.push(createRetrievalCandidate({
        node,
        compositeScore: instabilityScore,
        centralityScore: cent?.dependencyInfluenceScore ?? 0,
        proximityScore: 0,
        semanticScore: 0,
        riskScore: risk?.propagationPressure ?? 0,
        source: 'hotspot_pattern',
        reason: `high instability: ${instabilityScore.toFixed(3)}`,
      }));
    }

    return candidates;
  }

  retrieveByCyclicDependency(
    ctx: RetrievalContext,
    config?: ContextConfig,
  ): RetrievalCandidate[] {
    const cfg = config ?? resolveContextConfig();
    const visited = new Set<string>();
    const cyclicNodes: string[] = [];

    function dfs(nodeId: string, path: Set<string>): boolean {
      if (path.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      path.add(nodeId);
      const neighbors = ctx.adjacency.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor, path)) {
          cyclicNodes.push(nodeId);
          path.delete(nodeId);
          return true;
        }
      }
      path.delete(nodeId);
      return false;
    }

    for (const nodeId of ctx.sortedNodeIds) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, new Set());
      }
    }

    const unique = [...new Set(cyclicNodes)];
    const candidates: RetrievalCandidate[] = [];

    for (const nodeId of unique.slice(0, cfg.maxCandidates)) {
      const raw = ctx.nodeMap.get(nodeId);
      if (!raw) continue;
      const cent = ctx.centralityMap.get(nodeId);
      const inst = ctx.instabilityMap.get(nodeId);
      const risk = ctx.propagationRiskMap.get(nodeId);
      const node = toContextNode({
        nodeId: raw.id, filePath: raw.filePath, depth: 0, nodeType: raw.nodeType,
        language: raw.language, symbolName: raw.symbolName, centralityScore: cent?.dependencyInfluenceScore ?? null,
        instabilityScore: inst?.instabilityScore ?? null, propagationRiskScore: risk?.propagationPressure ?? null,
        fanIn: null, fanOut: null, semanticType: null, classification: null,
      });
      candidates.push(createRetrievalCandidate({
        node,
        compositeScore: 1,
        centralityScore: cent?.dependencyInfluenceScore ?? 0,
        proximityScore: 0,
        semanticScore: 0,
        riskScore: risk?.propagationPressure ?? 0,
        source: 'cyclic_dependency',
        reason: 'part of cyclic dependency',
      }));
    }

    return candidates;
  }

  retrieveByCriticalPath(
    ctx: RetrievalContext,
    seedId: string,
    config?: ContextConfig,
  ): RetrievalCandidate[] {
    const cfg = config ?? resolveContextConfig();
    const paths = retrieveCriticalPropagationPaths(ctx, seedId, cfg.maxDepth);
    return candidatesFromCriticalPaths(paths, ctx, 'critical_path');
  }
}
