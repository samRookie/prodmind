import { createHash } from 'node:crypto';
import type { ArchitectureDiff, DiffType, DiffSeverity } from './diff-types.ts';

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

export function fingerprintDiff(input: {
  diffType: DiffType;
  severity: DiffSeverity;
  previousSnapshotId: string;
  currentSnapshotId: string;
  impactedNodes: string[];
  evidence: { metricType: string; previousValue: number; currentValue: number }[];
}): string {
  const ordered: Record<string, unknown> = {
    diffType: input.diffType,
    severity: input.severity,
    previousSnapshotId: input.previousSnapshotId,
    currentSnapshotId: input.currentSnapshotId,
    impactedNodes: [...input.impactedNodes].sort(),
    evidence: input.evidence.map(e => ({ metricType: e.metricType, previousValue: Math.round(e.previousValue * 1000) / 1000, currentValue: Math.round(e.currentValue * 1000) / 1000 }))
      .sort((a, b) => a.metricType.localeCompare(b.metricType)),
  };
  return createHash('sha256').update(canonicalJson(ordered)).digest('hex');
}

export function fingerprintDiffBatch(diffs: ArchitectureDiff[]): string {
  const fps = diffs.map(d => d.fingerprint).sort();
  return createHash('sha256').update(canonicalJson(fps)).digest('hex');
}
