import { describe, it, expect } from 'vitest';
import { renderMarkdownReport, renderJsonContent } from '../../reporting/report-renderer.ts';
import { buildReportSection } from '../../reporting/report-builder.ts';
import { buildArchitectureReport } from '../../reporting/report-builder.ts';

describe('MarkdownRenderer', () => {
  it('renders markdown with all sections', () => {
    const s1 = buildReportSection({ title: 'S1', content: 'C1', severity: 'HIGH', metrics: [{ metricType: 'M1', metricValue: 10 }] });
    const s2 = buildReportSection({ title: 'S2', content: 'C2', severity: 'LOW', impactedNodes: ['n1'] });
    const report = buildArchitectureReport({ reportType: 'COMPREHENSIVE_REPORT', snapshotId: 's1', title: 'Test Report', summary: 'Summary', sections: [s1, s2], jsonContent: {} });
    const md = renderMarkdownReport(report);
    expect(md).toContain('# Test Report');
    expect(md).toContain('## S1');
    expect(md).toContain('## S2');
    expect(md).toContain('**Metrics:**');
    expect(md).toContain('**Impacted Nodes:**');
  });

  it('json content is serializable', () => {
    const s1 = buildReportSection({ title: 'S1', content: 'C1', severity: 'HIGH' });
    const report = buildArchitectureReport({ reportType: 'COMPREHENSIVE_REPORT', snapshotId: 's1', title: 'Test', summary: 'Summary', sections: [s1], jsonContent: {} });
    const json = renderJsonContent(report);
    expect(json.fingerprint).toBe(report.fingerprint);
    expect(json.sections).toHaveLength(1);
  });
});
