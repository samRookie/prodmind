import type { ArchitectureReport, ReportInput } from './reporting-types.ts';

export function renderMarkdownReport(report: ArchitectureReport): string {
  const lines: string[] = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Snapshot:** ${report.snapshotId}`);
  lines.push(`**Fingerprint:** \`${report.fingerprint}\``);
  lines.push('');
  lines.push(report.summary);
  lines.push('');
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
    if (section.metrics.length > 0) {
      lines.push('**Metrics:**');
      for (const m of section.metrics) {
        lines.push(`- ${m.metricType}: ${m.metricValue}`);
      }
      lines.push('');
    }
    if (section.impactedNodes.length > 0) {
      lines.push('**Impacted Nodes:**');
      for (const n of section.impactedNodes) {
        lines.push(`- \`${n}\``);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function renderJsonContent(report: ArchitectureReport): Record<string, unknown> {
  return {
    fingerprint: report.fingerprint,
    title: report.title,
    generatedAt: report.generatedAt,
    snapshotId: report.snapshotId,
    summary: report.summary,
    sections: report.sections.map(s => ({
      title: s.title, content: s.content, severity: s.severity,
      metrics: s.metrics, impactedNodes: s.impactedNodes,
    })),
  };
}
