import { describe, expect,it } from 'vitest';

import { createContextNode } from '../contracts.ts';
import { RankingEngine } from '../ranking.ts';

describe('RankingEngine', () => {
  const makeNode = (overrides: Partial<Parameters<typeof createContextNode>[0]> = {}) =>
    createContextNode({
      nodeId: 'n1',
      filePath: 'src/main.ts',
      depth: 0,
      nodeType: 'module',
      language: 'typescript',
      symbolName: null,
      centralityScore: null,
      instabilityScore: null,
      propagationRiskScore: null,
      fanIn: null,
      fanOut: null,
      semanticType: null,
      ...overrides,
    });

  describe('computeCompositeScore', () => {
    it('scores default node based on proximity when all scores null', () => {
      const engine = new RankingEngine();
      const node = makeNode();
      // proximity = 1/(0+1) = 1, weight = 0.25 => 0.25
      expect(engine.computeCompositeScore(node)).toBe(0.25);
    });

    it('computes weighted score from node metrics', () => {
      const engine = new RankingEngine();
      const node = makeNode({
        centralityScore: 1,
        propagationRiskScore: 0.5,
        depth: 2,
        semanticType: 'API_LAYER',
      });
      const score = engine.computeCompositeScore(node);
      // centrality: 0.25*1 = 0.25
      // proximity: 0.25*(1/3) ≈ 0.083
      // semantic: 0.25*(10/10) = 0.25
      // risk: 0.25*0.5 = 0.125
      // total ≈ 0.708
      expect(score).toBeGreaterThan(0.60);
      expect(score).toBeLessThan(0.80);
    });

    it('returns depth=1 proximity for depth 0', () => {
      const engine = new RankingEngine();
      const node = makeNode({ depth: 0 });
      const score = engine.computeCompositeScore(node, {
        centrality: 0, proximity: 1, semantic: 0, risk: 0,
      });
      expect(score).toBe(1);
    });

    it('uses custom weights when provided', () => {
      const engine = new RankingEngine();
      const node = makeNode({ centralityScore: 1, depth: 0 });
      const score = engine.computeCompositeScore(node, {
        centrality: 1, proximity: 0, semantic: 0, risk: 0,
      });
      expect(score).toBe(1);
    });

    it('maps semantic importance correctly', () => {
      const engine = new RankingEngine();
      const apiNode = makeNode({ semanticType: 'API_LAYER' });
      const testNode = makeNode({ semanticType: 'TESTING' });
      const apiScore = engine.computeCompositeScore(apiNode, {
        centrality: 0, proximity: 0, semantic: 1, risk: 0,
      });
      const testScore = engine.computeCompositeScore(testNode, {
        centrality: 0, proximity: 0, semantic: 1, risk: 0,
      });
      expect(apiScore).toBe(1);
      expect(testScore).toBe(0.1);
    });
  });

  describe('rankNodes', () => {
    it('returns empty array for empty input', () => {
      const engine = new RankingEngine();
      expect(engine.rankNodes([])).toEqual([]);
    });

    it('sorts by composite score descending', () => {
      const engine = new RankingEngine();
      const high = makeNode({ nodeId: 'high', centralityScore: 1, depth: 0 });
      const mid = makeNode({ nodeId: 'mid', centralityScore: 0.5, depth: 0 });
      const low = makeNode({ nodeId: 'low', centralityScore: 0, depth: 0 });
      const ranked = engine.rankNodes([low, high, mid]);

      expect(ranked[0]!.node.nodeId).toBe('high');
      expect(ranked[1]!.node.nodeId).toBe('mid');
      expect(ranked[2]!.node.nodeId).toBe('low');
    });

    it('breaks ties by semantic importance then nodeId', () => {
      const engine = new RankingEngine();
      const api = makeNode({ nodeId: 'b', semanticType: 'API_LAYER', centralityScore: 0.5, depth: 0 });
      const data = makeNode({ nodeId: 'a', semanticType: 'DATA_LAYER', centralityScore: 0.5, depth: 0 });
      const ranked = engine.rankNodes([data, api]);

      expect(ranked[0]!.node.nodeId).toBe('b');
      expect(ranked[1]!.node.nodeId).toBe('a');
    });

    it('attaches composite score and source to candidates', () => {
      const engine = new RankingEngine();
      const node = makeNode({ centralityScore: 1, depth: 0 });
      const ranked = engine.rankNodes([node]);
      expect(ranked[0]!.compositeScore).toBeGreaterThan(0);
      expect(ranked[0]!.source).toBe('ranked');
      expect(ranked[0]!.reason).toBeTruthy();
    });
  });

  describe('rankAndSelect', () => {
    it('returns empty result for empty input', () => {
      const engine = new RankingEngine();
      const result = engine.rankAndSelect([]);
      expect(result.candidates).toEqual([]);
      expect(result.totalCandidates).toBe(0);
      expect(result.discardedCount).toBe(0);
    });

    it('limits results to topK', () => {
      const engine = new RankingEngine();
      const nodes = Array.from({ length: 10 }, (_, i) =>
        makeNode({ nodeId: `n${i}`, centralityScore: (10 - i) / 10, depth: 0 }),
      );
      const result = engine.rankAndSelect(nodes, 3);
      expect(result.candidates).toHaveLength(3);
      expect(result.discardedCount).toBe(7);
    });

    it('preserves weights in result metadata', () => {
      const engine = new RankingEngine();
      const node = makeNode();
      const result = engine.rankAndSelect([node], 5, {
        centrality: 0.4, proximity: 0.3, semantic: 0.2, risk: 0.1,
      });
      expect(result.weightsUsed.centrality).toBe(0.4);
      expect(result.weightsUsed.risk).toBe(0.1);
    });
  });
});
