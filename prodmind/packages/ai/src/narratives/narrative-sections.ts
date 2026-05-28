import type { NarrativeSection, NarrativeEvidenceRef, NarrativeSeverity } from './narrative-types.ts';

export function buildSection(input: {
  title: string; content: string; severity: NarrativeSeverity;
  evidenceRefs?: NarrativeEvidenceRef[];
  metrics?: { metricType: string; metricValue: number }[];
  impactedNodes?: string[];
}): NarrativeSection {
  return {
    title: input.title, content: input.content, severity: input.severity,
    evidenceRefs: (input.evidenceRefs ?? []).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
    metrics: (input.metrics ?? []).sort((a, b) => a.metricType.localeCompare(b.metricType)),
    impactedNodes: (input.impactedNodes ?? []).sort(),
  };
}
