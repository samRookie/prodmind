import type { ContextConfig, ContextWeights } from './config.ts';
import { resolveContextConfig } from './config.ts';
import type { ContextNode, RankedContextResult,RetrievalCandidate } from './contracts.ts';
import { createRankedContextResult,createRetrievalCandidate } from './contracts.ts';

export interface ExtendedWeights extends ContextWeights {
  instability: number;
  fanRatio: number;
  cyclic: number;
  hotspot: number;
  architectureProximity: number;
}

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

export interface RankingInput {
  node: ContextNode;
  instabilityScore?: number;
  fanIn?: number;
  fanOut?: number;
  isCyclic?: boolean;
  isHotspot?: boolean;
  architectureProximity?: number;
}

function getSemanticImportance(node: ContextNode): number {
  if (!node.semanticType) return 0;
  return SEMANTIC_IMPORTANCE[node.semanticType] ?? 0;
}

function computeFanRatio(fanIn: number | null | undefined, fanOut: number | null | undefined): number {
  const fi = fanIn ?? 0;
  const fo = fanOut ?? 0;
  const total = fi + fo;
  if (total === 0) return 0;
  return Math.min(1, fo / total);
}

export class RankingEngine {
  private config: ContextConfig;
  private cyclicNodeIds?: Set<string>;
  private hotspotNodeIds?: Set<string>;

  constructor(config?: ContextConfig) {
    this.config = config ?? resolveContextConfig();
  }

  setCyclicNodes(nodeIds: string[]): void {
    this.cyclicNodeIds = new Set(nodeIds);
  }

  setHotspotNodes(nodeIds: string[]): void {
    this.hotspotNodeIds = new Set(nodeIds);
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

  computeExtendedScore(
    input: RankingInput,
    weights?: ExtendedWeights,
  ): number {
    const w = weights ?? this.getDefaultExtendedWeights();
    const node = input.node;

    const centrality = node.centralityScore ?? 0;
    const proximity = node.depth > 0 ? 1 / (node.depth + 1) : 1;
    const semanticImportance = getSemanticImportance(node) / 10;
    const risk = node.propagationRiskScore ?? 0;
    const instability = input.instabilityScore ?? node.instabilityScore ?? 0;
    const fanRatio = computeFanRatio(input.fanIn ?? node.fanIn, input.fanOut ?? node.fanOut);
    const cyclic = this.cyclicNodeIds?.has(node.nodeId) ? 1 : 0;
    const hotspot = this.hotspotNodeIds?.has(node.nodeId) ? 1 : 0;
    const architectureProx = input.architectureProximity ?? 0;

    return (
      w.centrality * centrality +
      w.proximity * proximity +
      w.semantic * semanticImportance +
      w.risk * risk +
      w.instability * instability +
      w.fanRatio * fanRatio +
      w.cyclic * cyclic +
      w.hotspot * hotspot +
      w.architectureProximity * architectureProx
    );
  }

  rankNodes(
    nodes: ContextNode[],
    weights?: ContextWeights,
  ): RetrievalCandidate[] {
    const w = weights ?? this.config.weights;

    const candidates = nodes.map((node) => {
      const compositeScore = this.computeCompositeScore(node, w);
      const instabilityScore = node.instabilityScore ?? 0;
      const fanRatio = computeFanRatio(node.fanIn, node.fanOut);
      const isCyclic = this.cyclicNodeIds?.has(node.nodeId) ? 1 : 0;
      const isHotspot = this.hotspotNodeIds?.has(node.nodeId) ? 1 : 0;

      return createRetrievalCandidate({
        node,
        compositeScore,
        centralityScore: node.centralityScore ?? 0,
        proximityScore: node.depth > 0 ? 1 / (node.depth + 1) : 1,
        semanticScore: getSemanticImportance(node) / 10,
        riskScore: node.propagationRiskScore ?? 0,
        source: 'ranked',
        reason: `composite ${compositeScore.toFixed(3)} (inst:${instabilityScore.toFixed(2)} fan:${fanRatio.toFixed(2)} cyclic:${isCyclic} hotspot:${isHotspot})`,
      });
    });

    candidates.sort((a, b) => {
      const scoreDiff = b.compositeScore - a.compositeScore;
      if (scoreDiff !== 0) return scoreDiff;
      const riskDiff = (b.node.propagationRiskScore ?? 0) - (a.node.propagationRiskScore ?? 0);
      if (riskDiff !== 0) return riskDiff;
      const semanticDiff = getSemanticImportance(b.node) - getSemanticImportance(a.node);
      if (semanticDiff !== 0) return semanticDiff;
      return a.node.nodeId.localeCompare(b.node.nodeId);
    });

    return candidates;
  }

  rankNodesExtended(
    inputs: RankingInput[],
    weights?: ExtendedWeights,
  ): RetrievalCandidate[] {
    const w = weights ?? this.getDefaultExtendedWeights();

    const candidates = inputs.map((input) => {
      const compositeScore = this.computeExtendedScore(input, w);
      const node = input.node;
      return createRetrievalCandidate({
        node,
        compositeScore,
        centralityScore: node.centralityScore ?? 0,
        proximityScore: node.depth > 0 ? 1 / (node.depth + 1) : 1,
        semanticScore: getSemanticImportance(node) / 10,
        riskScore: node.propagationRiskScore ?? 0,
        source: 'extended_ranked',
        reason: `extended ${compositeScore.toFixed(3)}`,
      });
    });

    candidates.sort((a, b) => {
      const scoreDiff = b.compositeScore - a.compositeScore;
      if (scoreDiff !== 0) return scoreDiff;
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

  rankAndSelectExtended(
    inputs: RankingInput[],
    topK?: number,
    weights?: ExtendedWeights,
  ): RankedContextResult {
    const k = topK ?? this.config.rankingTopK;
    const w = weights ?? this.getDefaultExtendedWeights();
    const allCandidates = this.rankNodesExtended(inputs, w);
    const selected = allCandidates.slice(0, k);
    const discardedCount = Math.max(0, allCandidates.length - k);

    return createRankedContextResult({
      candidates: selected,
      strategy: 'EXTENDED_METRIC_WEIGHTED',
      weightsUsed: { ...w },
      discardedCount,
    });
  }

  private getDefaultExtendedWeights(): ExtendedWeights {
    return {
      centrality: 0.15,
      proximity: 0.15,
      semantic: 0.15,
      risk: 0.15,
      instability: 0.1,
      fanRatio: 0.1,
      cyclic: 0.1,
      hotspot: 0.05,
      architectureProximity: 0.05,
    };
  }
}
