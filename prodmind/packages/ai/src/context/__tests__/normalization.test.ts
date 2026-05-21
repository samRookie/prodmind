import { describe, expect,it } from 'vitest';

import { createAssemblyMetrics,createAssemblyTrace, createContextAssemblyResult, createContextBudget, createContextNode } from '../contracts.ts';
import { ContextFingerprinter } from '../normalization/fingerprinter.ts';
import { ContextNormalizer } from '../normalization/normalizer.ts';

describe('ContextNormalizer', () => {
  const normalizer = new ContextNormalizer();

  it('sorts slices by id', () => {
    const result = makeResult(['b', 'a', 'c']);
    const normalized = normalizer.normalize(result);
    expect(normalized.slices.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts nodes within each slice by nodeId', () => {
    const result = makeResult(['x']);
    const normalized = normalizer.normalize(result);
    for (const slice of normalized.slices) {
      const ids = slice.nodes.map((n) => n.nodeId);
      expect(ids).toEqual([...ids].sort());
    }
  });

  it('handles empty slices', () => {
    const result = makeResult([]);
    const normalized = normalizer.normalize(result);
    expect(normalized.slices).toHaveLength(0);
  });
});

describe('ContextFingerprinter', () => {
  const fingerprinter = new ContextFingerprinter();

  it('produces stable fingerprints for same input', () => {
    const r1 = makeResult(['a']);
    const r2 = makeResult(['a']);
    expect(fingerprinter.fingerprint(r1)).toBe(fingerprinter.fingerprint(r2));
  });

  it('produces different fingerprints for different input', () => {
    const r1 = makeResult(['a']);
    const r2 = makeResult(['a', 'b']);
    expect(fingerprinter.fingerprint(r1)).not.toBe(fingerprinter.fingerprint(r2));
  });

  it('fingerprints requests', () => {
    const req = { snapshotId: 'snap1', seedNodeIds: ['n1'] };
    expect(fingerprinter.fingerprintRequest(req)).toBeTruthy();
    expect(fingerprinter.fingerprintRequest(req).length).toBe(16);
  });

  it('produces deterministic JSON', () => {
    const obj = { b: 2, a: 1 };
    const stable = fingerprinter.stableJson(obj);
    expect(JSON.parse(stable)).toEqual({ a: 1, b: 2 });
  });
});

function makeResult(sliceIds: string[]) {
  return createContextAssemblyResult({
    request: { snapshotId: 'test' },
    slices: sliceIds.map((id) => ({
      id,
      kind: 'local_neighborhood' as const,
      strategy: 'TEST',
      nodes: [
        createContextNode({
          nodeId: 'n1', filePath: 'f.ts', depth: 0, nodeType: 'class', language: 'ts',
          symbolName: null, centralityScore: null, instabilityScore: null,
          propagationRiskScore: null, fanIn: null, fanOut: null, semanticType: null,
        }),
        createContextNode({
          nodeId: 'n0', filePath: 'g.ts', depth: 1, nodeType: 'interface', language: 'ts',
          symbolName: null, centralityScore: null, instabilityScore: null,
          propagationRiskScore: null, fanIn: null, fanOut: null, semanticType: null,
        }),
      ],
      edges: [],
      regions: [],
      chains: [],
      tokenCount: 100,
      metadata: {},
    })),
    budget: createContextBudget({ total: 1000, used: 200, reserved: 100, hardLimit: 16000, softLimit: 12000 }),
    trace: createAssemblyTrace([]),
    metrics: createAssemblyMetrics({
      totalRetrieved: 0, totalRanked: 0, totalSliced: 0, totalCompressed: 0,
      totalDeduped: 0, totalDiscarded: 0, finalTokenCount: 0, budgetUtilization: 0, assemblyDurationMs: 0,
    }),
    fingerprint: '',
  });
}
