import type { RetrievalInput } from '@prodmind/parser';
import { beforeEach,describe, expect, it } from 'vitest';

import { resetContextConfig,resolveContextConfig } from '../config.ts';
import { ContextRetrievalEngine } from '../retrieval.ts';

function makeInput(): RetrievalInput {
  return {
    nodes: [
      { id: 'n1', filePath: 'src/main.ts', fileHash: 'hash1', nodeType: 'module', symbolName: 'App', language: 'typescript', metadataJson: null },
      { id: 'n2', filePath: 'src/utils.ts', fileHash: 'hash2', nodeType: 'module', symbolName: 'Utils', language: 'typescript', metadataJson: null },
      { id: 'n3', filePath: 'src/db.ts', fileHash: 'hash3', nodeType: 'module', symbolName: 'Db', language: 'typescript', metadataJson: null },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
      { id: 'e2', sourceNodeId: 'n1', targetNodeId: 'n3', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
    ],
    snapshotId: 'snap-test',
  };
}

describe('ContextRetrievalEngine', () => {
  beforeEach(() => {
    resetContextConfig();
  });

  describe('retrieve', () => {
    it('returns ranked candidates from dependency neighborhood strategy', () => {
      const engine = new ContextRetrievalEngine();
      const result = engine.retrieve(makeInput(), {
        snapshotId: 'snap-test',
        seedNodeIds: ['n1'],
        strategies: ['DEPENDENCY_NEIGHBORHOOD'] as any,
      });

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.strategy).toContain('DEPENDENCY_NEIGHBORHOOD');
      expect(result.weightsUsed.centrality).toBeDefined();
    });

    it('uses default strategy when none specified', () => {
      const engine = new ContextRetrievalEngine();
      const result = engine.retrieve(makeInput(), {
        snapshotId: 'snap-test',
        seedNodeIds: ['n1'],
      });

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.strategy).toBeTruthy();
    });

    it('deduplicates candidates across multiple strategies', () => {
      const engine = new ContextRetrievalEngine();
      const result = engine.retrieve(makeInput(), {
        snapshotId: 'snap-test',
        seedNodeIds: ['n1'],
        strategies: ['DEPENDENCY_NEIGHBORHOOD', 'DEPTH_LIMITED'] as any,
      });

      const nodeIds = result.candidates.map((c) => c.node.nodeId);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);
    });

    it('returns candidates with source and reason', () => {
      const engine = new ContextRetrievalEngine();
      const result = engine.retrieve(makeInput(), {
        snapshotId: 'snap-test',
        seedNodeIds: ['n1'],
        strategies: ['DEPENDENCY_NEIGHBORHOOD'] as any,
      });

      for (const c of result.candidates) {
        expect(c.source).toBeTruthy();
        expect(c.reason).toBeTruthy();
      }
    });

    it('respects maxCandidates from config', () => {
      const engine = new ContextRetrievalEngine();
      const result = engine.retrieve(makeInput(), {
        snapshotId: 'snap-test',
        seedNodeIds: ['n1'],
        strategies: ['DEPENDENCY_NEIGHBORHOOD'] as any,
      }, { ...resolveContextConfig(), rankingTopK: 2, maxCandidates: 2 });

      expect(result.candidates.length).toBeLessThanOrEqual(2);
    });

    it('throws RetrievalPhaseError when no candidates found', () => {
      const engine = new ContextRetrievalEngine();
      expect(() => {
        engine.retrieve(makeInput(), {
          snapshotId: 'snap-test',
          seedNodeIds: ['nonexistent'],
          strategies: ['DEPENDENCY_NEIGHBORHOOD'] as any,
        });
      }).toThrow('No candidates retrieved');
    });
  });
});
