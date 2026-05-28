import type { RiskSeverity } from './risk-types.ts';

export interface RiskScoreInput {
  severity: RiskSeverity;
  propagationDepth: number;
  couplingDensity: number;
  sccCentrality: number;
  instability: number;
  blastRadius: number;
  architectureDepth: number;
  ruleRecurrenceFrequency: number;
}

const SEVERITY_BASE: Record<RiskSeverity, number> = { LOW: 0.25, MODERATE: 0.5, HIGH: 0.75, CRITICAL: 1.0 };

export function computeNormalizedRiskScore(input: RiskScoreInput): number {
  const severityWeight = SEVERITY_BASE[input.severity] * 0.25;
  const propagationWeight = Math.min(input.propagationDepth / 10, 1) * 0.15;
  const couplingWeight = Math.min(input.couplingDensity * 3, 1) * 0.15;
  const centralityWeight = Math.min(input.sccCentrality, 1) * 0.1;
  const instabilityWeight = Math.min(input.instability, 1) * 0.1;
  const blastRadiusWeight = Math.min(input.blastRadius, 1) * 0.1;
  const depthWeight = Math.min(input.architectureDepth / 15, 1) * 0.075;
  const recurrenceWeight = Math.min(input.ruleRecurrenceFrequency / 10, 1) * 0.075;
  const score = severityWeight + propagationWeight + couplingWeight + centralityWeight + instabilityWeight + blastRadiusWeight + depthWeight + recurrenceWeight;
  return Math.round(Math.min(score, 1) * 1000) / 1000;
}

export function scoreToSeverity(score: number): RiskSeverity {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5) return 'HIGH';
  if (score >= 0.25) return 'MODERATE';
  return 'LOW';
}
