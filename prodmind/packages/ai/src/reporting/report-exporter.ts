import type { ArchitectureReport } from './reporting-types.ts';
import { renderMarkdownReport, renderJsonContent } from './report-renderer.ts';

export function exportReportAsJson(report: ArchitectureReport): string {
  return JSON.stringify(renderJsonContent(report), null, 2);
}

export function exportReportsAsJsonBundle(reports: ArchitectureReport[]): string {
  const sorted = [...reports].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  return JSON.stringify(sorted.map(r => renderJsonContent(r)), null, 2);
}

export function exportReportAsMarkdown(report: ArchitectureReport): string {
  return renderMarkdownReport(report);
}

export function exportReportsAsMarkdownBundle(reports: ArchitectureReport[]): string {
  const sorted = [...reports].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  return sorted.map(r => renderMarkdownReport(r)).join('\n\n---\n\n');
}
