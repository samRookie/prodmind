import type { NarrativeSeverity } from './narrative-types.ts';

function severityToNumeric(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MODERATE': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}

export function maxSeverity(severities: string[]): NarrativeSeverity {
  const sorted = [...severities].sort((a, b) => severityToNumeric(b) - severityToNumeric(a));
  return (sorted[0] ?? 'LOW') as NarrativeSeverity;
}

export function rankNarrativesBySeverity<T extends { severity: NarrativeSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => severityToNumeric(b.severity) - severityToNumeric(a.severity));
}
