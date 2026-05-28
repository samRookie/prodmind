import type { ArchitectureReport, ReportSection, ReportType } from './reporting-types.ts';
import { fingerprintReport } from './report-fingerprint.ts';

export function buildReportSection(input: {
  title: string; content: string; severity: string;
  metrics?: { metricType: string; metricValue: number }[];
  impactedNodes?: string[];
}): ReportSection {
  return {
    title: input.title, content: input.content, severity: input.severity,
    metrics: (input.metrics ?? []).sort((a, b) => a.metricType.localeCompare(b.metricType)),
    impactedNodes: (input.impactedNodes ?? []).sort(),
  };
}

export function buildArchitectureReport(input: {
  reportType: ReportType;
  snapshotId: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  jsonContent: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): ArchitectureReport {
  const generatedAt = new Date().toISOString();
  const sectionLines = input.sections.map(s => `## ${s.title}\n\n${s.content}`);
  const markdownContent = `# ${input.title}\n\n${input.summary}\n\n${sectionLines.join('\n\n')}`;
  const fp = fingerprintReport({
    reportType: input.reportType, snapshotId: input.snapshotId,
    markdownContent, sectionTitles: input.sections.map(s => s.title),
  });
  return {
    reportType: input.reportType, fingerprint: fp,
    title: input.title, generatedAt, snapshotId: input.snapshotId,
    summary: input.summary, sections: [...input.sections],
    markdownContent, jsonContent: { ...input.jsonContent },
    metadata: { ...input.metadata },
  };
}
