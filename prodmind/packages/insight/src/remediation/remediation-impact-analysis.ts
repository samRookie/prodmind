import type { RemediationImpact } from '../types/index.ts';

export function estimateRemediationImpact(
  currentRisk: number,
  currentComplexity: number,
  currentCoupling: number,
): RemediationImpact {
  return {
    riskReduction: Math.min(currentRisk * 0.5, 1),
    complexityReduction: Math.min(currentComplexity * 0.3, 1),
    couplingReduction: Math.min(currentCoupling * 0.4, 1),
    stabilityImprovement: Math.min((currentRisk + currentCoupling) * 0.3, 1),
  };
}

export function computeNetImprovement(impact: RemediationImpact): number {
  return (
    impact.riskReduction * 0.35 +
    impact.complexityReduction * 0.25 +
    impact.couplingReduction * 0.25 +
    impact.stabilityImprovement * 0.15
  );
}
