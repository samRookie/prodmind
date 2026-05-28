import type { PatternSeverity } from './pattern-types.ts';

export function classifyPatternConfidence(
  metricEvidenceCount: number,
  sccEvidenceCount: number,
  topologyEvidenceCount: number,
  metricStrength: number,
): number {
  const evidenceScore = Math.min((metricEvidenceCount * 0.3 + sccEvidenceCount * 0.3 + topologyEvidenceCount * 0.2) / 3, 1);
  const strengthScore = Math.min(metricStrength, 1);
  return Math.round(Math.min(evidenceScore * 0.6 + strengthScore * 0.4, 1) * 100) / 100;
}

export function classifyPatternSeverity(
  impactCount: number,
  maxSeverityFactor: number,
): PatternSeverity {
  if (impactCount >= 10 && maxSeverityFactor >= 0.8) return 'CRITICAL';
  if (impactCount >= 5 && maxSeverityFactor >= 0.5) return 'HIGH';
  if (impactCount >= 2) return 'MODERATE';
  return 'LOW';
}
