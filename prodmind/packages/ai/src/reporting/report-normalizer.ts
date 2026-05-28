import type { ArchitectureReport } from './reporting-types.ts';

export interface NormalizedReport {
  reportType: string;
  fingerprint: string;
  title: string;
  snapshotId: string;
  summary: string;
  sectionCount: number;
  severity: string;
}

function reportSeverity(report: ArchitectureReport): string {
  const severities = report.sections.map(s => s.severity);
  if (severities.some(s => s === 'CRITICAL')) return 'CRITICAL';
  if (severities.some(s => s === 'HIGH')) return 'HIGH';
  if (severities.some(s => s === 'MODERATE')) return 'MODERATE';
  return 'LOW';
}

export function normalizeReport(report: ArchitectureReport): NormalizedReport {
  return {
    reportType: report.reportType,
    fingerprint: report.fingerprint,
    title: report.title,
    snapshotId: report.snapshotId,
    summary: report.summary,
    sectionCount: report.sections.length,
    severity: reportSeverity(report),
  };
}

export function normalizeReportBatch(reports: ArchitectureReport[]): NormalizedReport[] {
  return reports.map(normalizeReport).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}
