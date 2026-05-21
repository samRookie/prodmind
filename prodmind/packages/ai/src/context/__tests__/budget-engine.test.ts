import { describe, expect,it } from 'vitest';

import { BudgetEngine } from '../budgeting/budget-engine.ts';
import { createContextNode,createContextSlice } from '../contracts.ts';
import { BudgetExceededError } from '../errors.ts';

describe('BudgetEngine', () => {
  const engine = new BudgetEngine();

  it('passes slices within limits', () => {
    const slices = makeSlices(3, 50);
    const result = engine.enforce(slices, 10000, 8000, 500);
    expect(result.slices.length).toBe(3);
    expect(result.discarded).toHaveLength(0);
  });

  it('discards slices that exceed hard limit', () => {
    const slices = makeSlices(5, 500);
    const result = engine.enforce(slices, 1000, 800, 200);
    expect(result.discarded.length).toBeGreaterThan(0);
  });

  it('trims slices between soft and hard limit', () => {
    const slices = makeSlices(3, 800);
    const result = engine.enforce(slices, 2000, 300, 100);
    const trimmed = result.slices.filter((s) => s.metadata['budgetTrimmed']);
    expect(trimmed.length).toBeGreaterThanOrEqual(1);
  });

  it('throws on zero available budget', () => {
    const slices = makeSlices(1, 100);
    expect(() => engine.enforce(slices, 50, 30, 50)).toThrow(BudgetExceededError);
  });

  it('handles empty slices', () => {
    const result = engine.enforce([], 10000, 8000, 500);
    expect(result.slices).toHaveLength(0);
    expect(result.discarded).toHaveLength(0);
  });

  it('estimates tokens from node and edge count', () => {
    expect(engine.estimateTokens(10, 5)).toBe((10 * 20) + (5 * 8));
  });

  it('preserves critical slices (risk_oriented)', () => {
    const riskSlice = makeSlice('risk_oriented', 20, 900);
    const normalSlice = makeSlice('local_neighborhood', 20, 900);
    const result = engine.enforce([normalSlice, riskSlice], 2000, 300, 100);
    expect(result.slices.find((s) => s.kind === 'risk_oriented')).toBeDefined();
  });

  it('preserves architectural_boundary slices', () => {
    const archSlice = makeSlice('architectural_boundary', 20, 900);
    const result = engine.enforce([archSlice], 2000, 300, 100);
    expect(result.slices.find((s) => s.kind === 'architectural_boundary')).toBeDefined();
  });
});

function makeSlices(count: number, tokensPerSlice: number): ReturnType<typeof createContextSlice>[] {
  return Array.from({ length: count }, (_, i) =>
    createContextSlice({
      kind: i % 3 === 0 ? 'local_neighborhood' : i % 3 === 1 ? 'upstream_chain' : 'downstream_chain',
      strategy: 'TEST',
      nodes: Array.from({ length: 5 }, (_, j) => createContextNode({
        nodeId: `n${i}-${j}`, filePath: `file${i}.ts`, depth: j, nodeType: 'class', language: 'ts',
        symbolName: `Sym${i}`, centralityScore: 0.5, instabilityScore: null, propagationRiskScore: null,
        fanIn: null, fanOut: null, semanticType: null,
      })),
      edges: [],
      regions: [],
      chains: [],
      tokenCount: tokensPerSlice,
      metadata: {},
    }),
  );
}

function makeSlice(kind: 'risk_oriented' | 'local_neighborhood' | 'architectural_boundary', nodeCount: number, tokens: number): ReturnType<typeof createContextSlice> {
  return createContextSlice({
    kind,
    strategy: 'TEST',
    nodes: Array.from({ length: nodeCount }, (_, i) => createContextNode({
      nodeId: `n-${i}`, filePath: `f${i}.ts`, depth: 0, nodeType: 'class', language: 'ts',
      symbolName: `S${i}`, centralityScore: 0.5, instabilityScore: null, propagationRiskScore: null,
      fanIn: null, fanOut: null, semanticType: null,
    })),
    edges: [],
    regions: [],
    chains: [],
    tokenCount: tokens,
    metadata: {},
  });
}
