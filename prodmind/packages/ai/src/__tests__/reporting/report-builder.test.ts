import { describe, it, expect } from 'vitest';
import { buildArchitectureReport, buildReportSection } from '../../reporting/report-builder.ts';

describe('ReportBuilder', () => {
  it('builds report section with sorted metrics', () => {
    const section = buildReportSection({ title: 'Test', content: 'Content', severity: 'HIGH', metrics: [{ metricType: 'B', metricValue: 2 }, { metricType: 'A', metricValue: 1 }] });
    expect(section.metrics[0]!.metricType).toBe('A');
    expect(section.metrics[1]!.metricType).toBe('B');
  });

  it('builds architecture report with markdown', () => {
    const section = buildReportSection({ title: 'S1', content: 'C1', severity: 'HIGH' });
    const report = buildArchitectureReport({ reportType: 'COMPREHENSIVE_REPORT', snapshotId: 's1', title: 'Test', summary: 'Summary', sections: [section], jsonContent: {} });
    expect(report.fingerprint.length).toBeGreaterThan(0);
    expect(report.markdownContent).toContain('# Test');
    expect(report.markdownContent).toContain('## S1');
  });

  it('deterministic fingerprint for same input', () => {
    const section = buildReportSection({ title: 'S1', content: 'C1', severity: 'HIGH' });
    const a = buildArchitectureReport({ reportType: 'COMPREHENSIVE_REPORT', snapshotId: 's1', title: 'Test', summary: 'Summary', sections: [section], jsonContent: {} });
    const b = buildArchitectureReport({ reportType: 'COMPREHENSIVE_REPORT', snapshotId: 's1', title: 'Test', summary: 'Summary', sections: [section], jsonContent: {} });
    expect(a.fingerprint).toBe(b.fingerprint);
  });
});
