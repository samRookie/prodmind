import type { CognitionSnapshot } from './cognition-types.ts';

export interface NormalizedCognition {
  cognitionType: string;
  fingerprint: string;
  architectureSummary: string;
  dominantRisks: { riskType: string; normalizedScore: number; severity: string }[];
  dominantPatterns: { patternType: string; confidence: number; severity: string }[];
  healthScore: { overall: number; label: string };
  metadata: Record<string, unknown>;
}

export function normalizeCognition(snapshot: CognitionSnapshot): NormalizedCognition {
  return {
    cognitionType: snapshot.cognitionType,
    fingerprint: snapshot.fingerprint,
    architectureSummary: snapshot.architectureSummary,
    dominantRisks: [...snapshot.dominantRisks].sort((a, b) => b.normalizedScore - a.normalizedScore),
    dominantPatterns: [...snapshot.dominantPatterns].sort((a, b) => b.confidence - a.confidence),
    healthScore: { overall: snapshot.healthScore.overall, label: snapshot.healthScore.label },
    metadata: Object.keys(snapshot.metadata).sort().reduce((acc, k) => { acc[k] = snapshot.metadata[k]; return acc; }, {} as Record<string, unknown>),
  };
}

export function normalizeCognitionBatch(snapshots: CognitionSnapshot[]): NormalizedCognition[] {
  return snapshots.map(normalizeCognition).sort((a, b) => a.healthScore.overall - b.healthScore.overall || a.fingerprint.localeCompare(b.fingerprint));
}
