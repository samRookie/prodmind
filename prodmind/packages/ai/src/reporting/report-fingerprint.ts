import { createHash } from 'node:crypto';
import type { ArchitectureReport, ReportType } from './reporting-types.ts';

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    const items = value.map(canonicalJson);
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((k) => `${canonicalJson(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(',')}}`;
  }
  return String(value);
}

export function fingerprintReport(input: {
  reportType: ReportType;
  snapshotId: string;
  markdownContent: string;
  sectionTitles: string[];
}): string {
  const ordered: Record<string, unknown> = {
    reportType: input.reportType,
    snapshotId: input.snapshotId,
    markdownContent: input.markdownContent,
    sectionTitles: [...input.sectionTitles].sort(),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintReportBatch(reports: ArchitectureReport[]): string {
  const fps = reports.map(r => r.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
