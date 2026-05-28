import { describe, it, expect } from 'vitest';
import { fingerprintNarrative, fingerprintNarrativeBatch } from '../../narratives/narrative-fingerprint.ts';
import type { Narrative } from '../../narratives/narrative-types.ts';

describe('NarrativeFingerprint', () => {
  it('produces same fingerprint for same input', () => {
    const a = fingerprintNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Summary', evidenceFingerprints: ['fp1'], impactedSystems: ['n1'] });
    const b = fingerprintNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Summary', evidenceFingerprints: ['fp1'], impactedSystems: ['n1'] });
    expect(a).toBe(b);
  });

  it('produces different fingerprint for different input', () => {
    const a = fingerprintNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Summary', evidenceFingerprints: ['fp1'], impactedSystems: ['n1'] });
    const b = fingerprintNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Different', evidenceFingerprints: ['fp1'], impactedSystems: ['n1'] });
    expect(a).not.toBe(b);
  });

  it('fingerprintNarrativeBatch is stable', () => {
    const n1: Narrative = { narrativeType: 'EXECUTIVE_SUMMARY', fingerprint: 'a', title: 'T', summary: 'S', severity: 'HIGH', severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 }, sections: [], evidenceRefs: [], impactedSystems: [], metadata: {} };
    const n2: Narrative = { narrativeType: 'GLOBAL_ARCHITECTURE_SUMMARY', fingerprint: 'b', title: 'T', summary: 'S', severity: 'MODERATE', severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 }, sections: [], evidenceRefs: [], impactedSystems: [], metadata: {} };
    const a = fingerprintNarrativeBatch([n1, n2]);
    const b = fingerprintNarrativeBatch([n2, n1]);
    expect(a).toBe(b);
  });
});
