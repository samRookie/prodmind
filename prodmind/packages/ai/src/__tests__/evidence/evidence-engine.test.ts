import { describe, expect, it } from 'vitest';
import { EvidenceEngine } from '../../evidence/evidence-engine.ts';
import type { EvidenceLinkingInput } from '../../evidence/evidence-types.ts';

function makeInput(overrides?: Partial<EvidenceLinkingInput>): EvidenceLinkingInput {
  return {
    insightFingerprint: 'abc123def456',
    insightCategory: 'HOTSPOT',
    insightSeverity: 'HIGH',
    insightScope: 'NODE',
    insightTitle: 'Test hotspot',
    insightSummary: 'A test hotspot insight',
    evidence: [
      { nodeId: 'node-1', metricType: 'FAN_ANALYSIS', metricValue: 100, description: 'Fan analysis data' },
    ],
    snapshotId: 'snap-1',
    graphNodes: [
      { id: 'node-1', filePath: 'src/a.ts', nodeType: 'module' },
      { id: 'node-2', filePath: 'src/b.ts', nodeType: 'module' },
    ],
    graphEdges: [
      { id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-2' },
    ],
    metrics: [
      { nodeId: 'node-1', metricType: 'FAN_ANALYSIS', metricValue: 100, metricScope: 'NODE' },
    ],
    sccData: {
      componentCount: 1,
      componentMap: new Map([['node-1', 0], ['node-2', 0]]),
      componentNodes: new Map([[0, ['node-1', 'node-2']]]),
    },
    ...overrides,
  };
}

describe('EvidenceEngine', () => {
  it('links evidence for valid input', () => {
    const engine = new EvidenceEngine();
    const result = engine.link(makeInput());

    expect(result.totalLinked).toBe(1);
    expect(result.records).toHaveLength(1);
    expect(result.validationResult.valid).toBe(true);
  });

  it('rejects missing insight fingerprint', () => {
    const engine = new EvidenceEngine();
    const result = engine.link(makeInput({ insightFingerprint: '' }));

    expect(result.totalLinked).toBe(0);
    expect(result.validationResult.valid).toBe(false);
    expect(result.validationResult.errors.some((e) => e.includes('fingerprint'))).toBe(true);
  });

  it('rejects dangling node references', () => {
    const engine = new EvidenceEngine();
    const result = engine.link(makeInput({
      evidence: [{ nodeId: 'nonexistent-node', description: 'Bad ref' }],
    }));

    expect(result.totalLinked).toBe(0);
    expect(result.validationResult.valid).toBe(false);
    expect(result.validationResult.errors.some((e) => e.includes('Dangling'))).toBe(true);
  });

  it('produces deterministic output', () => {
    const engine = new EvidenceEngine();
    const input = makeInput();

    const r1 = engine.link(input);
    const r2 = engine.link(input);

    expect(r1.records[0]!.insightFingerprint).toBe(r2.records[0]!.insightFingerprint);
    expect(r1.records[0]!.payload.category).toBe(r2.records[0]!.payload.category);
    expect(r1.records[0]!.payload.graphNodes).toEqual(r2.records[0]!.payload.graphNodes);
  });

  it('includes supporting data in payload', () => {
    const engine = new EvidenceEngine();
    const result = engine.link(makeInput());

    const payload = result.records[0]!.payload;
    expect(payload.supportingData.nodeCount).toBe(2);
    expect(payload.supportingData.edgeCount).toBe(1);
    expect(payload.supportingData.sccCount).toBe(1);
  });

  it('generates warning for empty evidence list', () => {
    const engine = new EvidenceEngine();
    const result = engine.link(makeInput({ evidence: [] }));

    expect(result.totalLinked).toBe(1);
    expect(result.validationResult.warnings.some((w) => w.includes('no supporting data'))).toBe(true);
  });
});
