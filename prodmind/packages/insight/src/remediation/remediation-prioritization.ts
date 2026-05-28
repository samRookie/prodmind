import { severityToNumber } from '../core/insight-types.ts';
import type { InsightSeverity,RemediationPlan } from '../types/index.ts';

export function prioritizeRemediations(
  plans: RemediationPlan[],
): RemediationPlan[] {
  return [...plans].sort((a, b) => {
    const aScore = severityToNumber(a.priority) * a.impact.riskReduction;
    const bScore = severityToNumber(b.priority) * b.impact.riskReduction;
    return bScore - aScore;
  });
}

export function computeRemediationUrgency(
  riskReduction: number,
  complexityReduction: number,
  couplingReduction: number,
): InsightSeverity {
  const combined = riskReduction * 0.4 + complexityReduction * 0.3 + couplingReduction * 0.3;
  if (combined > 0.7) return 'CRITICAL';
  if (combined > 0.5) return 'HIGH';
  if (combined > 0.3) return 'MODERATE';
  return 'LOW';
}
