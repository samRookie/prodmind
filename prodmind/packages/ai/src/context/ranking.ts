import type { ContextNode, RetrievalCandidate, RankedContextResult } from './contracts.ts';
import { createRetrievalCandidate, createRankedContextResult } from './contracts.ts';
import type { ContextConfig, ContextWeights } from './config.ts';
import { resolveContextConfig } from './config.ts';

const SEMANTIC_IMPORTANCE: Record<string, number> = {
  API_LAYER: 10,
  SERVICE_LAYER: 9,
  DOMAIN_LAYER: 8,
  DATA_LAYER: 7,
  SECURITY: 6,
  OBSERVABILITY: 5,
  INFRASTRUCTURE: 4,
  SHARED_UTILITY: 3,
  CONFIGURATION: 2,
  TESTING: 1,
  BUILD_SYSTEM: 1,
  UNKNOWN: 0,
};

function getSemanticImportance(node: ContextNode): number {
  if (!node.semanticType) return 0;
  return SEMANTIC_IMPORTANCE[node.semanticType] ?? 0;
}

export class RankingEngine {
  private config: ContextConfig;

  constructor(config?: ContextConfig) {
    this.config = config ?? resolveContextConfig();
  }

  computeCompositeScore(node: ContextNode, weights?: ContextWeights): number {
    const w = weights ?? this.config.weights;
    const centrality = node.centralityScore ?? 0;
    const proximity = node.depth > 0 ? 1 / (node.depth + 1) : 1;
    const semanticImportance = getSemanticImportance(node) / 10;
    const risk = node.propagationRiskScore ?? 0;

    return (
      w.centrality * centrality +
      w.proximity * proximity +
      w.semantic * semanticImportance +
      w.risk * risk
    );
  }

  rankNodes(
    nodes: ContextNode[],
    weights?: ContextWeights,
  ): RetrievalCandidate[] {
    const w = weights ?? this.config.weights;

    const candidates = nodes.map((node) => {
      const compositeScore = this.computeCompositeScore(node, w);
      return createRetrievalCandidate({
        node,
        compositeScore,
        centralityScore: node.centralityScore ?? 0,
        proximityScore: node.depth > 0 ? 1 / (node.depth + 1) : 1,
        semanticScore: getSemanticImportance(node) / 10,
        riskScore: node.propagationRiskScore ?? 0,
        source: 'ranked',
        reason: `composite ${compositeScore.toFixed(3)}`,
      });
    });

    candidates.sort((a, b) => {
      const scoreDiff = b.compositeScore - a.compositeScore;
      if (scoreDiff !== 0) return scoreDiff;
      const semanticDiff = getSemanticImportance(b.node) - getSemanticImportance(a.node);
      if (semanticDiff !== 0) return semanticDiff;
      return a.node.nodeId.localeCompare(b.node.nodeId);
    });

    return candidates;
  }

  rankAndSelect(
    nodes: ContextNode[],
    topK?: number,
    weights?: ContextWeights,
  ): RankedContextResult {
    const k = topK ?? this.config.rankingTopK;
    const w = weights ?? this.config.weights;
    const allCandidates = this.rankNodes(nodes, w);
    const selected = allCandidates.slice(0, k);
    const discardedCount = Math.max(0, allCandidates.length - k);

    return createRankedContextResult({
      candidates: selected,
      strategy: 'METRIC_WEIGHTED',
      weightsUsed: { ...w },
      discardedCount,
    });
  }
}
