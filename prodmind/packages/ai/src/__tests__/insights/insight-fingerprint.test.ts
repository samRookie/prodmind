import { describe, expect, it } from 'vitest';
import { fingerprintInsight, fingerprintInsightBatch, fingerprintEvidenceRef } from '../../insights/insight-fingerprint.ts';
import type { Insight, EvidenceRef } from '../../insights/insight-types.ts';

describe('InsightFingerprint', () => {
  it('produces deterministic fingerprint for same input', () => {
    const input = {
      type: 'HOTSPOT' as const,
      severity: 'HIGH' as const,
      scope: 'NODE' as const,
      title: 'Test hotspot',
      summary: 'This is a test hotspot insight',
      evidence: [
        { nodeId: 'node-1', metricType: 'FAN_ANALYSIS', metricValue: 100, description: 'Fan-in: 50, fan-out: 50' },
      ],
      metadata: { fanIn: 50, fanOut: 50 },
    };

    const fp1 = fingerprintInsight(input);
    const fp2 = fingerprintInsight(input);

    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('produces different fingerprints for different inputs', () => {
    const input1 = {
      type: 'HOTSPOT' as const,
      severity: 'HIGH' as const,
      scope: 'NODE' as const,
      title: 'Test hotspot',
      summary: 'Summary A',
      evidence: [],
      metadata: {},
    };

    const input2 = {
      type: 'INSTABILITY' as const,
      severity: 'HIGH' as const,
      scope: 'NODE' as const,
      title: 'Test instability',
      summary: 'Summary B',
      evidence: [],
      metadata: {},
    };

    expect(fingerprintInsight(input1)).not.toBe(fingerprintInsight(input2));
  });

  it('fingerprint is stable after reordering evidence', () => {
    const input = {
      type: 'HOTSPOT' as const,
      severity: 'HIGH' as const,
      scope: 'NODE' as const,
      title: 'Test',
      summary: 'Test summary',
      evidence: [
        { nodeId: 'node-b', description: 'Second node' },
        { nodeId: 'node-a', description: 'First node' },
      ],
      metadata: {},
    };

    const fp = fingerprintInsight(input);
    expect(fp.length).toBe(64);
  });

  it('fingerprintEvidenceRef is deterministic', () => {
    const ref: EvidenceRef = { nodeId: 'n1', metricType: 'INSTABILITY', metricValue: 0.5, description: 'Test' };
    expect(fingerprintEvidenceRef(ref)).toBe(fingerprintEvidenceRef(ref));
  });

  it('fingerprintInsightBatch is deterministic', () => {
    const insights: Insight[] = [
      { type: 'HOTSPOT', severity: 'HIGH', scope: 'NODE', fingerprint: 'fp-1', title: 'A', summary: 'Sum A', evidence: [], metadata: {} },
      { type: 'INSTABILITY', severity: 'LOW', scope: 'GLOBAL', fingerprint: 'fp-2', title: 'B', summary: 'Sum B', evidence: [], metadata: {} },
    ];

    expect(fingerprintInsightBatch(insights)).toBe(fingerprintInsightBatch(insights));
  });
});
