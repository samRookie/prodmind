import type { Narrative, NarrativeSection, NarrativeType, NarrativeSeverity, NarrativeEvidenceRef } from './narrative-types.ts';
import { fingerprintNarrative } from './narrative-fingerprint.ts';

export function buildNarrative(input: {
  narrativeType: NarrativeType;
  severity: NarrativeSeverity;
  title: string;
  summary: string;
  sections: NarrativeSection[];
  evidenceRefs: NarrativeEvidenceRef[];
  impactedSystems: string[];
  severityDistribution: { critical: number; high: number; moderate: number; low: number };
  metadata?: Record<string, unknown>;
}): Narrative {
  const allEvidenceFps = [...new Set(input.evidenceRefs.map(e => e.fingerprint))];
  const fp = fingerprintNarrative({
    narrativeType: input.narrativeType, severity: input.severity,
    title: input.title, summary: input.summary,
    evidenceFingerprints: allEvidenceFps, impactedSystems: input.impactedSystems,
  });
  return {
    narrativeType: input.narrativeType, fingerprint: fp,
    title: input.title, summary: input.summary,
    severity: input.severity, severityDistribution: input.severityDistribution,
    sections: [...input.sections], evidenceRefs: [...input.evidenceRefs],
    impactedSystems: [...input.impactedSystems].sort(),
    metadata: { ...input.metadata },
  };
}
