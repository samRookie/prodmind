import { describe, expect,it } from 'vitest';

import { ContextCompressor } from '../compression/context-compressor.ts';
import { createContextNode,createContextSlice } from '../contracts.ts';

describe('ContextCompressor', () => {
  const compressor = new ContextCompressor();

  it('returns raw when prefer_raw', () => {
    const slice = makeSlice(10);
    const result = compressor.compress(slice, 'prefer_raw', 0.7);
    expect(result.compressionEnvelope?.kind).toBe('raw');
  });

  it('compresses when prefer_compressed', () => {
    const slice = makeSlice(100);
    const result = compressor.compress(slice, 'prefer_compressed', 0.7);
    expect(result.compressionEnvelope?.kind).toBe('compressed');
    expect(result.nodes.length).toBeLessThan(100);
  });

  it('returns raw when node count is 0', () => {
    const slice = makeSlice(0);
    const result = compressor.compress(slice, 'prefer_compressed', 0.7);
    expect(result.nodes).toHaveLength(0);
  });

  it('adaptive returns raw for small slices', () => {
    const slice = makeSlice(3);
    const result = compressor.compress(slice, 'adaptive', 0.7);
    expect(result.compressionEnvelope?.kind).toBe('raw');
  });

  it('hybrid keeps seed nodes uncompressed', () => {
    const slice = makeSlice(50);
    const result = compressor.compress(slice, 'hybrid', 0.7);
    expect(result.compressionEnvelope?.kind).toBe('hybrid');
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it('throws for invalid adaptive threshold', () => {
    const slice = makeSlice(100);
    expect(() => compressor.compress(slice, 'adaptive', 0)).toThrow();
    expect(() => compressor.compress(slice, 'adaptive', 1)).toThrow();
  });
});

function makeSlice(nodeCount: number) {
  return createContextSlice({
    kind: 'local_neighborhood',
    strategy: 'TEST',
    nodes: Array.from({ length: nodeCount }, (_, i) =>
      createContextNode({
        nodeId: `n${i}`, filePath: `f${i}.ts`, depth: i % 3, nodeType: 'class', language: 'ts',
        symbolName: null, centralityScore: null, instabilityScore: null,
        propagationRiskScore: null, fanIn: null, fanOut: null, semanticType: null,
      }),
    ),
    edges: [],
    regions: [],
    chains: [],
    tokenCount: nodeCount * 20,
    metadata: {},
  });
}
