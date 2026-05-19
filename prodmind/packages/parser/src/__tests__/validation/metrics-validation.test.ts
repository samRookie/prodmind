import { describe, it, expect } from 'vitest';
import { createValidationContext } from '../../validation/validation-types.ts';
import { validateMetricsStructure, validateMetricRanges } from '../../validation/metrics-validation.ts';

function makeNode(id: string, filePath = `src/${id}.ts`) {
  return { id, filePath, fileHash: null, nodeType: 'FILE' as const, symbolName: null, language: 'ts', metadataJson: null };
}

describe('metrics-validation', () => {
  it('validateMetricRanges flags out-of-range centrality', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1')],
      edges: [],
      centrality: [{ nodeId: 'n1', filePath: 'src/n1.ts', inDegree: 0, outDegree: 0, reachabilityCount: 0, dependencyInfluenceScore: 1.5, isUtilityHub: false }],
    });
    const issues = validateMetricRanges(ctx);
    expect(issues.some((i) => i.issueCode === 'CENTRALITY_OUT_OF_RANGE')).toBe(true);
  });

  it('validateMetricRanges flags invalid NaN values', () => {
    const ctx = createValidationContext({
      snapshotId: 's1',
      nodes: [makeNode('n1')],
      edges: [],
      centrality: [{ nodeId: 'n1', filePath: 'src/n1.ts', inDegree: 0, outDegree: 0, reachabilityCount: 0, dependencyInfluenceScore: NaN, isUtilityHub: false }],
    });
    const issues = validateMetricRanges(ctx);
    expect(issues.some((i) => i.issueCode === 'INVALID_CENTRALITY')).toBe(true);
  });

  it('validateMetricsStructure produces deterministic output', () => {
    const ctx = createValidationContext({
      snapshotId: 's1', nodes: [makeNode('n1')], edges: [],
    });
    const run1 = validateMetricsStructure(ctx);
    const run2 = validateMetricsStructure(ctx);
    expect(run1.map((i) => i.issueCode)).toEqual(run2.map((i) => i.issueCode));
  });
});
