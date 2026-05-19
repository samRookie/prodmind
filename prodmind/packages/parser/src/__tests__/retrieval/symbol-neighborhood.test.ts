import { describe, it, expect } from 'vitest';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';
import {
  retrieveSymbolOwners,
  retrieveSymbolNeighbors,
  retrieveSharedNamespaces,
  retrieveCrossModuleSymbolUsage,
} from '../../retrieval/symbol-neighborhood.ts';

function makeNode(id: string, symbolName: string | null, filePath: string) {
  return { id, filePath, fileHash: null, nodeType: 'FILE', symbolName, language: 'ts', metadataJson: null };
}

function makeEdge(id: string, source: string, target: string) {
  return { id, sourceNodeId: source, targetNodeId: target, edgeType: 'IMPORTS', weight: 1, metadataJson: null };
}

describe('symbol-neighborhood', () => {
  const nodes = [
    makeNode('n1', 'Logger', 'src/utils/logger.ts'),
    makeNode('n2', 'Config', 'src/config.ts'),
    makeNode('n3', null, 'src/app.ts'),
  ];
  const edges = [
    makeEdge('e1', 'n3', 'n1'),
    makeEdge('e2', 'n3', 'n2'),
  ];
  const ctx = createRetrievalCache({ nodes, edges });

  it('retrieveSymbolOwners returns owning nodes', () => {
    const owners = retrieveSymbolOwners(ctx, 'Logger');
    expect(owners.some((n) => n.nodeId === 'n1')).toBe(true);
  });

  it('retrieveSymbolOwners returns empty for unknown symbol', () => {
    const owners = retrieveSymbolOwners(ctx, 'Unknown');
    expect(owners).toHaveLength(0);
  });

  it('retrieveSymbolNeighbors returns dependents', () => {
    const neighbors = retrieveSymbolNeighbors(ctx, 'Logger');
    expect(neighbors.some((n) => n.nodeId === 'n3')).toBe(true);
  });

  it('retrieveSharedNamespaces returns nodes in namespace', () => {
    const nsNodes = retrieveSharedNamespaces(ctx, 'src/utils');
    expect(nsNodes.some((n) => n.nodeId === 'n1')).toBe(true);
  });

  it('retrieveCrossModuleSymbolUsage returns usage info', () => {
    const usage = retrieveCrossModuleSymbolUsage(ctx, 'Config');
    expect(usage.symbolName).toBe('Config');
    expect(usage.owningNodes.some((n) => n.nodeId === 'n2')).toBe(true);
  });

  it('produces deterministic ordering', () => {
    const run1 = retrieveSymbolOwners(ctx, 'Logger');
    const run2 = retrieveSymbolOwners(ctx, 'Logger');
    expect(run1.map((n) => n.nodeId)).toEqual(run2.map((n) => n.nodeId));
  });
});
