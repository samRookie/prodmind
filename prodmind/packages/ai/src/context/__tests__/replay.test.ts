import { describe, expect,it } from 'vitest';

import { createAssemblyMetrics,createAssemblyTrace, createContextAssemblyResult, createContextBudget } from '../contracts.ts';
import { ContextFingerprinter } from '../normalization/fingerprinter.ts';
import { ContextReplayEngine } from '../replay/context-replay.ts';

describe('ContextReplayEngine', () => {
  const engine = new ContextReplayEngine();

  it('detects matching results', () => {
    const r1 = makeResultFixed(1);
    const r2 = makeResultFixed(1);
    const env = engine.compare(r1, r2);
    expect(env.match).toBe(true);
    expect(env.divergence).toHaveLength(0);
  });

  it('detects diverging slice counts', () => {
    const r1 = makeResultFixed(2);
    const r2 = makeResultFixed(3);
    const env = engine.compare(r1, r2);
    expect(env.match).toBe(false);
    expect(env.divergence.length).toBeGreaterThan(0);
  });

  it('assertMatch throws on mismatch', () => {
    const r1 = makeResultFixed(1);
    const r2 = makeResultFixed(2);
    expect(() => engine.assertMatch(r1, r2)).toThrow();
  });

  it('assertMatch passes on match', () => {
    const r1 = makeResultFixed(1);
    const r2 = makeResultFixed(1);
    expect(() => engine.assertMatch(r1, r2)).not.toThrow();
  });
});

function makeResultFixed(sliceCount = 1) {
  const fpEngine = new ContextFingerprinter();
  const slices = Array.from({ length: sliceCount }, (_, i) => ({
    id: `s${i}`,
    kind: 'local_neighborhood' as const,
    strategy: 'TEST',
    nodes: [],
    edges: [],
    regions: [],
    chains: [],
    tokenCount: 100,
    metadata: {},
  }));
  const budget = createContextBudget({ total: 1000, used: 200, reserved: 100, hardLimit: 16000, softLimit: 12000 });
  const trace = createAssemblyTrace([]);
  const metrics = createAssemblyMetrics({
    totalRetrieved: 0, totalRanked: 0, totalSliced: 0, totalCompressed: 0,
    totalDeduped: 0, totalDiscarded: 0, finalTokenCount: 0, budgetUtilization: 0, assemblyDurationMs: 0,
  });
  const result = createContextAssemblyResult({
    request: { snapshotId: 'test' },
    slices,
    budget,
    trace,
    metrics,
    fingerprint: '',
  });
  const fp = fpEngine.fingerprint(result);
  return createContextAssemblyResult({
    request: { snapshotId: 'test' },
    slices,
    budget,
    trace,
    metrics,
    fingerprint: fp,
  });
}
