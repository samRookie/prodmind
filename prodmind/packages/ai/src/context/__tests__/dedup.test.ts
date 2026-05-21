import { describe, expect,it } from 'vitest';

import { createContextNode, createContextSlice } from '../contracts.ts';
import { ContextDeduper } from '../dedup/context-dedup.ts';

describe('ContextDeduper', () => {
  const deduper = new ContextDeduper();

  it('deduplicates nodes by nodeId', () => {
    const nodes = [
      makeNode('a', 'f1.ts'),
      makeNode('a', 'f1.ts'),
      makeNode('b', 'f2.ts'),
    ];
    const result = deduper.dedupNodes(nodes);
    expect(result).toHaveLength(2);
  });

  it('deduplicates slices by kind and node ids', () => {
    const s1 = makeSlice('local_neighborhood', ['a', 'b']);
    const s2 = makeSlice('local_neighborhood', ['a', 'b']);
    const result = deduper.dedupSlices([s1, s2]);
    expect(result).toHaveLength(1);
  });

  it('removes semantic redundancy keeping the richest slice per region', () => {
    const s1 = makeSlice('semantic_region', ['a', 'b']);
    const s2 = makeSlice('semantic_region', ['a']);
    const result = deduper.removeSemanticRedundancy([s1, s2]);
    expect(result).toHaveLength(1);
  });

  it('canonicalizes slices deterministically', () => {
    const s1 = makeSlice('local_neighborhood', ['b', 'a']);
    const result = deduper.canonicalize([s1]);
    expect(result[0]!.nodes.map((n) => n.nodeId)).toEqual(['a', 'b']);
  });

  it('handles empty input', () => {
    expect(deduper.dedupNodes([])).toHaveLength(0);
    expect(deduper.dedupSlices([])).toHaveLength(0);
    expect(deduper.removeSemanticRedundancy([])).toHaveLength(0);
    expect(deduper.canonicalize([])).toHaveLength(0);
  });
});

function makeNode(id: string, path: string) {
  return createContextNode({
    nodeId: id, filePath: path, depth: 0, nodeType: 'class', language: 'ts',
    symbolName: null, centralityScore: null, instabilityScore: null,
    propagationRiskScore: null, fanIn: null, fanOut: null, semanticType: null,
  });
}

function makeSlice(kind: 'local_neighborhood' | 'semantic_region', nodeIds: string[]) {
  return createContextSlice({
    kind,
    strategy: 'TEST',
    nodes: nodeIds.map((id) => makeNode(id, `${id}.ts`)),
    edges: [],
    regions: [],
    chains: [],
    tokenCount: 100,
    metadata: {},
  });
}
