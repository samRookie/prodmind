import type { InsightSeverity } from '../types/index.ts';
import { severityToNumber } from './insight-types.ts';

export function computePriority(
  severity: InsightSeverity,
  impact: number,
  urgency: number,
): number {
  const base = severityToNumber(severity) / 4;
  return (base * 0.4 + impact * 0.35 + urgency * 0.25);
}

export function computeOperationalSeverity(
  blastRadius: number,
  cascadeProbability: number,
  criticality: number,
): number {
  return (blastRadius * 0.3 + cascadeProbability * 0.35 + criticality * 0.35);
}
