import type { TemporalEvidence } from '../types/index.ts';

export interface RenderedEvidence {
  type: string;
  summary: string;
  metricSummary: string;
  confidenceLabel: string;
  snapshotCount: number;
}

export function renderEvidence(evidence: TemporalEvidence): RenderedEvidence {
  const metricSummary = Object.entries(evidence.metricValues)
    .map(([k, v]) => `${k}=${v.toFixed(3)}`)
    .join(', ');
  return {
    type: evidence.type,
    summary: evidence.description,
    metricSummary,
    confidenceLabel: evidence.confidence >= 0.8 ? 'high' : evidence.confidence >= 0.5 ? 'medium' : 'low',
    snapshotCount: evidence.snapshotIds.length,
  };
}

export function renderEvidenceList(evidenceList: TemporalEvidence[]): RenderedEvidence[] {
  return evidenceList.map(renderEvidence);
}
