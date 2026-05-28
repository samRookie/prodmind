import { describe, it, expect } from 'vitest';
import { ReportingEngine } from '../../reporting/reporting-engine.ts';
import { exportReportAsMarkdown, exportReportAsJson } from '../../reporting/report-exporter.ts';
import type { ReportInput } from '../../reporting/reporting-types.ts';

function makeInput(): ReportInput {
  return {
    snapshotId: 'test-snap-1',
    cognitionSnapshots: [{ cognitionType: 'GLOBAL', fingerprint: 'fp', architectureSummary: 'Summary', healthScore: { overall: 0.5, label: 'MODERATE' }, severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 }, dominantRisks: [], dominantPatterns: [], topRecommendations: [], criticalHotspots: [], evidenceReferences: [], confidenceSummary: { overall: 0.5 } }],
    narratives: [], patterns: [], risks: [], recommendations: [],
  };
}

describe('ReportDeterminism', () => {
  it('produces identical reports across runs', () => {
    const engine = new ReportingEngine();
    const a = engine.generate(makeInput());
    const b = engine.generate(makeInput());
    expect(a.reports.map(r => r.fingerprint)).toEqual(b.reports.map(r => r.fingerprint));
    expect(a.reports.map(r => r.markdownContent)).toEqual(b.reports.map(r => r.markdownContent));
  });

  it('exports produce identical markdown', () => {
    const engine = new ReportingEngine();
    const output = engine.generate(makeInput(), ['COMPREHENSIVE_REPORT']);
    const md1 = exportReportAsMarkdown(output.reports[0]!);
    const md2 = exportReportAsMarkdown(output.reports[0]!);
    expect(md1).toBe(md2);
  });

  it('exports produce identical json', () => {
    const engine = new ReportingEngine();
    const output = engine.generate(makeInput(), ['COMPREHENSIVE_REPORT']);
    const j1 = exportReportAsJson(output.reports[0]!);
    const j2 = exportReportAsJson(output.reports[0]!);
    expect(j1).toBe(j2);
  });
});
