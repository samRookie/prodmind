import type { RiskCorrelation } from './risk-types.ts';

export interface NormalizedRisk {
  riskType: string;
  severity: string;
  normalizedScore: number;
  fingerprint: string;
  title: string;
  summary: string;
  impactedNodes: string[];
  insightFingerprints: string[];
  patternFingerprints: string[];
  metadata: Record<string, unknown>;
}

export function normalizeRisk(correlation: RiskCorrelation): NormalizedRisk {
  return {
    riskType: correlation.riskType,
    severity: correlation.severity,
    normalizedScore: correlation.normalizedScore,
    fingerprint: correlation.fingerprint,
    title: correlation.title,
    summary: correlation.summary,
    impactedNodes: [...correlation.impactedNodes].sort(),
    insightFingerprints: [...correlation.insightFingerprints].sort(),
    patternFingerprints: [...correlation.patternFingerprints].sort(),
    metadata: Object.keys(correlation.metadata).sort().reduce((acc, k) => { acc[k] = correlation.metadata[k]; return acc; }, {} as Record<string, unknown>),
  };
}

export function normalizeRiskBatch(correlations: RiskCorrelation[]): NormalizedRisk[] {
  return correlations.map(normalizeRisk).sort((a, b) => b.normalizedScore - a.normalizedScore || a.fingerprint.localeCompare(b.fingerprint));
}
