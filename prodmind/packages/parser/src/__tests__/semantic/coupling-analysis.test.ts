import { describe, it, expect } from 'vitest';
import { CouplingType } from '@prodmind/contracts';
import { classifyCoupling, computeCouplingStrength, computePropagationRisk, detectCouplingHotspots, analyzeDirectEdges } from '../../semantic/coupling-analysis.ts';
import type { CouplingAnalysisInput } from '../../semantic/coupling-analysis.ts';

function makeNode(id: string, filePath = `/path/${id}.ts`) {
  return { id, filePath, nodeType: 'FILE' };
}

function makeEdge(id: string, source: string, target: string, type = 'IMPORTS', weight = 1.0) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: type, weight };
}

describe('classifyCoupling', () => {
  it('detects cyclic coupling', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [
      makeEdge('e1', 'a', 'b'),
      makeEdge('e2', 'b', 'a'),
    ];
    const result = classifyCoupling('a', 'b', nodes, edges);
    expect(result.couplingType).toBe(CouplingType.CYCLIC_COUPLING);
    expect(result.strength).toBe(1.0);
  });

  it('detects tight coupling for high fan-in/fan-out', () => {
    const nodes = [makeNode('hub'), makeNode('n1')];
    const edges = [
      makeEdge('e1', 'hub', 'n1'),
      makeEdge('e2', 'hub', 'n1'),
      makeEdge('e3', 'hub', 'n1'),
    ];
    const result = classifyCoupling('hub', 'n1', nodes, edges);
    expect(result.couplingType).toBe(CouplingType.TIGHT_COUPLING);
  });

  it('detects moderate coupling', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('e1', 'a', 'b'),
      makeEdge('e2', 'a', 'b'),
      makeEdge('e3', 'a', 'c'),
    ];
    const result = classifyCoupling('a', 'b', nodes, edges);
    expect(result.couplingType).toBe(CouplingType.MODERATE_COUPLING);
  });

  it('detects loose coupling for single edge', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const result = classifyCoupling('a', 'b', nodes, edges);
    expect(result.couplingType).toBe(CouplingType.LOOSE_COUPLING);
  });
});

describe('computeCouplingStrength', () => {
  it('returns average weight of connected edges', () => {
    const edges = [
      makeEdge('e1', 'a', 'b', 'IMPORTS', 0.5),
      makeEdge('e2', 'b', 'a', 'REFERENCES', 1.0),
    ];
    expect(computeCouplingStrength('a', 'b', edges)).toBe(0.75);
  });

  it('returns 0 for disconnected nodes', () => {
    expect(computeCouplingStrength('a', 'b', [])).toBe(0);
  });
});

describe('computePropagationRisk', () => {
  it('returns higher risk for high fan-in nodes', () => {
    const nodes = [makeNode('hub'), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('e1', 'a', 'hub'),
      makeEdge('e2', 'b', 'hub'),
      makeEdge('e3', 'c', 'hub'),
    ];
    const risk = computePropagationRisk('hub', nodes, edges);
    expect(risk).toBeGreaterThan(0);
  });

  it('returns 0 for disconnected nodes', () => {
    const nodes = [makeNode('alone')];
    expect(computePropagationRisk('alone', nodes, [])).toBe(0);
  });
});

describe('analyzeDirectEdges', () => {
  it('analyzes all edges without O(N^2)', () => {
    const input: CouplingAnalysisInput = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [
        makeEdge('e1', 'a', 'b'),
        makeEdge('e2', 'b', 'c'),
      ],
      snapshotId: 'snap-1',
    };
    const results = analyzeDirectEdges(input);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.snapshotId === 'snap-1')).toBe(true);
    expect(results.every((r) => r.id.length > 0)).toBe(true);
  });
});

describe('detectCouplingHotspots', () => {
  it('detects hotspots based on fan-in * fan-out', () => {
    const nodes = [makeNode('hub'), makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [
      makeEdge('e1', 'a', 'hub'),
      makeEdge('e2', 'b', 'hub'),
      makeEdge('e3', 'c', 'hub'),
      makeEdge('e4', 'hub', 'a'),
      makeEdge('e5', 'hub', 'b'),
    ];
    const input: CouplingAnalysisInput = { nodes, edges, snapshotId: 'snap-1' };
    const hotspots = detectCouplingHotspots(input, 3);
    expect(hotspots.length).toBeGreaterThan(0);
  });
});
