import { describe, it, expect } from 'vitest';
import type { RetrievalInput } from '@prodmind/parser';
import { NeighborhoodEngine } from '../neighborhood.ts';
import { createContextNode } from '../contracts.ts';

function makeInput(): RetrievalInput {
  return {
    nodes: [
      { id: 'n1', filePath: 'src/main.ts', fileHash: 'hash1', nodeType: 'module', symbolName: 'App', language: 'typescript', metadataJson: null },
      { id: 'n2', filePath: 'src/utils.ts', fileHash: 'hash2', nodeType: 'module', symbolName: 'Utils', language: 'typescript', metadataJson: null },
      { id: 'n3', filePath: 'src/db.ts', fileHash: 'hash3', nodeType: 'module', symbolName: 'Db', language: 'typescript', metadataJson: null },
      { id: 'n4', filePath: 'src/api.ts', fileHash: 'hash4', nodeType: 'module', symbolName: 'Api', language: 'typescript', metadataJson: null },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
      { id: 'e2', sourceNodeId: 'n1', targetNodeId: 'n3', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
      { id: 'e3', sourceNodeId: 'n2', targetNodeId: 'n4', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
    ],
    snapshotId: 'snap-test',
  };
}

describe('NeighborhoodEngine', () => {
  describe('buildContext', () => {
    it('builds RetrievalContext from input', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());
      expect(ctx.nodeMap.size).toBe(4);
      expect(ctx.edgeMap.size).toBe(3);
      expect(ctx.adjacency.has('n1')).toBe(true);
      expect(ctx.reverseAdjacency.has('n2')).toBe(true);
    });
  });

  describe('getDependencyChain', () => {
    it('builds downstream chain', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const chain = engine.getDependencyChain(ctx, 'n1', 'downstream', 3);
      expect(chain.direction).toBe('downstream');
      expect(chain.nodes.length).toBeGreaterThanOrEqual(2);
      expect(chain.chainId).toBeTruthy();
      expect(chain.edges.length).toBeGreaterThan(0);
    });

    it('builds upstream chain', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const chain = engine.getDependencyChain(ctx, 'n4', 'upstream', 3);
      expect(chain.direction).toBe('upstream');
      expect(chain.nodes.length).toBeGreaterThanOrEqual(1);
    });

    it('builds sibling chain (bidirectional)', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const chain = engine.getDependencyChain(ctx, 'n2', 'sibling', 3);
      expect(chain.direction).toBe('sibling');
      expect(chain.nodes.length).toBeGreaterThan(0);
    });

    it('computes totalRisk from node propagation scores', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const chain = engine.getDependencyChain(ctx, 'n1', 'downstream', 3);
      expect(chain.totalRisk).toBeGreaterThanOrEqual(0);
    });

    it('respects maxDepth', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const chain = engine.getDependencyChain(ctx, 'n1', 'downstream', 1);
      const max = chain.nodes.reduce((m, n) => Math.max(m, n.depth), 0);
      expect(max).toBeLessThanOrEqual(1);
    });
  });

  describe('getRegions', () => {
    it('clusters nodes into regions by semantic type', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const nodes = [
        createContextNode({
          nodeId: 'n1', filePath: 'a.ts', depth: 0, nodeType: 'module',
          language: 'typescript', symbolName: null,
          centralityScore: null, instabilityScore: null, propagationRiskScore: null,
          fanIn: null, fanOut: null, semanticType: 'API_LAYER',
        }),
        createContextNode({
          nodeId: 'n2', filePath: 'b.ts', depth: 0, nodeType: 'module',
          language: 'typescript', symbolName: null,
          centralityScore: null, instabilityScore: null, propagationRiskScore: null,
          fanIn: null, fanOut: null, semanticType: 'API_LAYER',
        }),
        createContextNode({
          nodeId: 'n3', filePath: 'c.ts', depth: 0, nodeType: 'module',
          language: 'typescript', symbolName: null,
          centralityScore: null, instabilityScore: null, propagationRiskScore: null,
          fanIn: null, fanOut: null, semanticType: 'DATA_LAYER',
        }),
      ];

      const regions = engine.getRegions(ctx, nodes);
      expect(regions.length).toBeGreaterThanOrEqual(2);
      const apiRegion = regions.find((r) => r.semanticType === 'API_LAYER');
      expect(apiRegion).toBeDefined();
      expect(apiRegion!.nodeIds.length).toBe(2);
    });
  });

  describe('getBlastRadius', () => {
    it('builds blast radius slice from seed node', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const slice = engine.getBlastRadius(ctx, 'n1', 3);
      expect(slice.kind).toBe('risk_oriented');
      expect(slice.strategy).toBe('BLAST_RADIUS');
      expect(slice.nodes.length).toBeGreaterThan(0);
      expect(slice.metadata.entryPoint).toBe('n1');
      expect(slice.id).toBeTruthy();
    });
  });

  describe('getArchitecturalSlice', () => {
    it('builds architectural slice by semantic type', () => {
      const engine = new NeighborhoodEngine();
      const ctx = engine.buildContext(makeInput());

      const slice = engine.getArchitecturalSlice(ctx, ['INFRASTRUCTURE']);
      expect(slice.kind).toBe('architectural_boundary');
      expect(slice.strategy).toBe('ARCHITECTURAL_SLICE');
      expect(slice.metadata.sliceType).toBe('cluster');
    });
  });
});
