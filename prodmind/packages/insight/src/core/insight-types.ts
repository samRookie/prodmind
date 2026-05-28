import type { InsightSeverity } from '../types/index.ts';

export const INSIGHT_CATEGORIES = [
  'architectural-risk',
  'instability',
  'dependency-risk',
  'propagation-risk',
  'complexity',
  'anti-pattern',
  'drift',
  'hotspot',
  'scalability-risk',
  'semantic-boundary-risk',
  'layering-violation',
  'cyclic-risk',
  'governance-risk',
  'risk',
] as const;

export const INSIGHT_SEVERITIES: InsightSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export const INSIGHT_STATUSES = ['active', 'resolved', 'mitigated', 'dismissed'] as const;

export const SEVERITY_THRESHOLDS: Record<InsightSeverity, number> = {
  LOW: 0.25,
  MODERATE: 0.5,
  HIGH: 0.75,
  CRITICAL: 0.9,
};

export function classifySeverity(score: number): InsightSeverity {
  if (score >= 0.9) return 'CRITICAL';
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.5) return 'MODERATE';
  return 'LOW';
}

export function severityToNumber(severity: InsightSeverity): number {
  switch (severity) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MODERATE': return 2;
    case 'LOW': return 1;
  }
}
