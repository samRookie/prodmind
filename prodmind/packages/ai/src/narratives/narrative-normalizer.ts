import type { Narrative } from './narrative-types.ts';

export interface NormalizedNarrative {
  narrativeType: string;
  fingerprint: string;
  title: string;
  summary: string;
  severity: string;
  sections: { title: string; severity: string }[];
  impactedSystems: string[];
}

export function normalizeNarrative(narrative: Narrative): NormalizedNarrative {
  return {
    narrativeType: narrative.narrativeType,
    fingerprint: narrative.fingerprint,
    title: narrative.title, summary: narrative.summary,
    severity: narrative.severity,
    sections: narrative.sections.map(s => ({ title: s.title, severity: s.severity })),
    impactedSystems: [...narrative.impactedSystems].sort(),
  };
}

export function normalizeNarrativeBatch(narratives: Narrative[]): NormalizedNarrative[] {
  return narratives.map(normalizeNarrative).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}
