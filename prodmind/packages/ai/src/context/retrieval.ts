import { RetrievalEngine, type RetrievalInput, type RetrievalQuery, type RetrievedNode, type RetrievalResult } from '@prodmind/parser';
import type { ContextAssemblyRequest, ContextNode, RetrievalCandidate, RankedContextResult } from './contracts.ts';
import { createContextNode, createRetrievalCandidate, createRankedContextResult } from './contracts.ts';
import type { ContextConfig } from './config.ts';
import { resolveContextConfig } from './config.ts';
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
}
