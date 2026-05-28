import { describe, it, expect } from 'vitest';
import { buildNarrative } from '../../narratives/narrative-builder.ts';
import { buildSection } from '../../narratives/narrative-sections.ts';

describe('NarrativeBuilder', () => {
  it('builds narrative with deterministic fingerprint', () => {
    const section = buildSection({ title: 'Test', content: 'Content', severity: 'HIGH', metrics: [{ metricType: 'TEST', metricValue: 1 }], impactedNodes: ['n1'] });
    const a = buildNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Summary', sections: [section], evidenceRefs: [], impactedSystems: ['n1'], severityDistribution: { critical: 0, high: 1, moderate: 0, low: 0 } });
    const b = buildNarrative({ narrativeType: 'EXECUTIVE_SUMMARY', severity: 'HIGH', title: 'Test', summary: 'Summary', sections: [section], evidenceRefs: [], impactedSystems: ['n1'], severityDistribution: { critical: 0, high: 1, moderate: 0, low: 0 } });
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('includes all sections', () => {
    const s1 = buildSection({ title: 'S1', content: 'C1', severity: 'HIGH' });
    const s2 = buildSection({ title: 'S2', content: 'C2', severity: 'LOW' });
    const narrative = buildNarrative({ narrativeType: 'GLOBAL_ARCHITECTURE_SUMMARY', severity: 'MODERATE', title: 'T', summary: 'S', sections: [s1, s2], evidenceRefs: [], impactedSystems: [], severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 } });
    expect(narrative.sections).toHaveLength(2);
  });
});
