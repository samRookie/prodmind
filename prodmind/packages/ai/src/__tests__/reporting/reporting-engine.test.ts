import { describe, it, expect } from 'vitest';
import { ReportingEngine } from '../../reporting/reporting-engine.ts';
import type { ReportInput } from '../../reporting/reporting-types.ts';

function makeInput(overrides?: Partial<ReportInput>): ReportInput {
  return {
    snapshotId: 'test-snap-1',
    cognitionSnapshots: [
      { cognitionType: 'GLOBAL', fingerprint: 'fp-c1', architectureSummary: 'System has 3 clusters', healthScore: { overall: 0.4, label: 'AT_RISK' }, severityDistribution: { critical: 2, high: 1, moderate: 0, low: 0 }, dominantRisks: [{ riskType: 'STABILITY_RISK', normalizedScore: 0.85, severity: 'CRITICAL' }], dominantPatterns: [{ patternType: 'CYCLIC_CLUSTER', confidence: 0.9, severity: 'CRITICAL' }], topRecommendations: [{ category: 'STABILITY', priority: 'IMMEDIATE', title: 'Fix' }], criticalHotspots: [{ nodeId: 'n1', severity: 'CRITICAL', reason: 'high fan' }], evidenceReferences: [{ source: 'insight', fingerprint: 'fp-i1', description: 'Hotspot' }], confidenceSummary: { overall: 0.7 } },
    ],
    narratives: [{ narrativeType: 'EXECUTIVE_SUMMARY', fingerprint: 'fp-n1', title: 'Exec', summary: 'Summary', severity: 'HIGH', sections: [], evidenceRefs: [] }],
    patterns: [{ patternType: 'CYCLIC_CLUSTER', severity: 'CRITICAL', impactedNodes: ['n1'], title: 'Cyclic' }],
    risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, impactedNodes: ['n1'], title: 'Stability' }],
    recommendations: [{ category: 'STABILITY', priority: 'IMMEDIATE', title: 'Fix', impactedNodes: ['n1'] }],
    ...overrides,
  };
}

describe('ReportingEngine', () => {
  it('generates COMPREHENSIVE_REPORT', () => {
    const engine = new ReportingEngine();
    const output = engine.generate(makeInput(), ['COMPREHENSIVE_REPORT']);
    expect(output.reports).toHaveLength(1);
    expect(output.reports[0]!.reportType).toBe('COMPREHENSIVE_REPORT');
  });

  it('generates all report types by default', () => {
    const engine = new ReportingEngine();
    const output = engine.generate(makeInput());
    expect(output.reports.length).toBeGreaterThanOrEqual(3);
  });

  it('report contains markdown content', () => {
    const engine = new ReportingEngine();
    const output = engine.generate(makeInput(), ['COMPREHENSIVE_REPORT']);
    expect(output.reports[0]!.markdownContent.length).toBeGreaterThan(0);
    expect(output.reports[0]!.markdownContent).toContain('#');
  });

  it('report has stable fingerprint', () => {
    const engine = new ReportingEngine();
    const a = engine.generate(makeInput());
    const b = engine.generate(makeInput());
    expect(a.reports.map(r => r.fingerprint)).toEqual(b.reports.map(r => r.fingerprint));
  });

  it('handles minimal input', () => {
    const engine = new ReportingEngine();
    const minimal: ReportInput = { snapshotId: 'min', cognitionSnapshots: [], narratives: [], patterns: [], risks: [], recommendations: [] };
    const output = engine.generate(minimal, ['HEALTH_REPORT']);
    expect(output.reports).toHaveLength(1);
  });
});
