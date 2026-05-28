import type { ArchitectureReport } from './reporting-types.ts';

export function indexReportsByType(reports: ArchitectureReport[]): Map<string, ArchitectureReport[]> {
  const map = new Map<string, ArchitectureReport[]>();
  for (const report of reports) {
    const existing = map.get(report.reportType) ?? [];
    existing.push(report);
    map.set(report.reportType, existing);
  }
  return map;
}

export function findReportByFingerprint(reports: ArchitectureReport[], fingerprint: string): ArchitectureReport | undefined {
  return reports.find(r => r.fingerprint === fingerprint);
}

export function findReportsBySnapshot(reports: ArchitectureReport[], snapshotId: string): ArchitectureReport[] {
  return reports.filter(r => r.snapshotId === snapshotId).sort((a, b) => a.title.localeCompare(b.title));
}
