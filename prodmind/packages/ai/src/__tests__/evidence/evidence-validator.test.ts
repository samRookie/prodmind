import { describe, expect, it } from 'vitest';
import { EvidenceValidator } from '../../evidence/evidence-validator.ts';
import type { EvidenceLinkingInput, EvidenceRecord, EvidencePayload } from '../../evidence/evidence-types.ts';

const makeValidInput = (): EvidenceLinkingInput => ({
  insightFingerprint: 'fp-123',
  insightCategory: 'HOTSPOT',
  insightSeverity: 'HIGH',
  insightScope: 'NODE',
  insightTitle: 'Test',
  insightSummary: 'Test summary',
  evidence: [{ nodeId: 'n1', description: 'Evidence' }],
  snapshotId: 'snap-1',
  graphNodes: [{ id: 'n1', filePath: 'src/a.ts', nodeType: 'module' }],
  graphEdges: [],
  metrics: [],
  sccData: { componentCount: 0, componentMap: new Map(), componentNodes: new Map() },
});

describe('EvidenceValidator', () => {
  const validator = new EvidenceValidator();

  it('passes valid input', () => {
    const result = validator.validateLinkingInput(makeValidInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing insight fingerprint', () => {
    const result = validator.validateLinkingInput({ ...makeValidInput(), insightFingerprint: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('fingerprint'))).toBe(true);
  });

  it('rejects missing snapshot ID', () => {
    const result = validator.validateLinkingInput({ ...makeValidInput(), snapshotId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('snapshot'))).toBe(true);
  });

  it('detects dangling node references', () => {
    const result = validator.validateLinkingInput({
      ...makeValidInput(),
      evidence: [{ nodeId: 'nonexistent', description: 'Bad ref' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Dangling'))).toBe(true);
  });

  it('warns when no evidence provided', () => {
    const result = validator.validateLinkingInput({
      ...makeValidInput(),
      evidence: [],
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('no supporting data'))).toBe(true);
  });

  it('validates record against known IDs', () => {
    const payload: EvidencePayload = {
      category: 'HOTSPOT',
      severity: 'HIGH',
      scope: 'NODE',
      insightFingerprint: 'fp-123',
      title: 'Test',
      summary: 'Test',
      graphNodes: [{ nodeId: 'n1' }],
      graphEdges: [],
      metrics: [],
      sccs: [],
      semanticClassifications: [],
      ruleTriggers: [],
      topologyChains: [],
      propagationPaths: [],
      summaryText: 'test',
      supportingData: {},
    };

    const record: EvidenceRecord = {
      id: 'ev-001',
      snapshotId: 'snap-1',
      insightFingerprint: 'fp-123',
      payload,
      linkedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validator.validateRecord(record, new Set(['n1']), new Set());
    expect(result.valid).toBe(true);
  });

  it('detects invalid node in record payload', () => {
    const payload: EvidencePayload = {
      category: 'HOTSPOT',
      severity: 'HIGH',
      scope: 'NODE',
      insightFingerprint: 'fp-123',
      title: 'Test',
      summary: 'Test',
      graphNodes: [{ nodeId: 'n2' }],
      graphEdges: [],
      metrics: [],
      sccs: [],
      semanticClassifications: [],
      ruleTriggers: [],
      topologyChains: [],
      propagationPaths: [],
      summaryText: 'test',
      supportingData: {},
    };

    const record: EvidenceRecord = {
      id: 'ev-002',
      snapshotId: 'snap-1',
      insightFingerprint: 'fp-123',
      payload,
      linkedAt: '2024-01-01T00:00:00.000Z',
    };

    const result = validator.validateRecord(record, new Set(['n1']), new Set());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('n2'))).toBe(true);
  });
});
